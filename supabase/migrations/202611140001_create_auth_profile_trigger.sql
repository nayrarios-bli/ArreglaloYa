
BEGIN;

-- 1. Funcion que crea los perfiles despues del registro
CREATE OR REPLACE FUNCTION public.handle_new_user_arreglaloya()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role text;
    v_full_name text;
    v_phone text;
BEGIN
    -- Obtener los datos enviados durante el registro
    v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', '');
    v_full_name := NULLIF(
        BTRIM(NEW.raw_user_meta_data ->> 'full_name'),
        ''
    );
    v_phone := NULLIF(
        BTRIM(NEW.raw_user_meta_data ->> 'phone'),
        ''
    );

    -- Solo se permiten registros de clientes y trabajadores
    IF v_role NOT IN ('client', 'worker') THEN
        RAISE EXCEPTION 'Rol de registro no permitido';
    END IF;

    -- El nombre es obligatorio
    IF v_full_name IS NULL THEN
        RAISE EXCEPTION 'El nombre completo es obligatorio';
    END IF;

    -- Crear el perfil general
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        phone
    )
    VALUES (
        NEW.id,
        v_role::public.app_role,
        v_full_name,
        v_phone
    );

    -- Crear el perfil correspondiente al tipo de usuario
    IF v_role = 'client' THEN
        INSERT INTO public.client_profiles (user_id)
        VALUES (NEW.id);

    ELSIF v_role = 'worker' THEN
        INSERT INTO public.worker_profiles (user_id)
        VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Evitar que la funcion se invoque como RPC
REVOKE ALL ON FUNCTION public.handle_new_user_arreglaloya()
FROM PUBLIC, anon, authenticated;

-- 3. Crear el trigger de registro
CREATE TRIGGER on_auth_user_created_arreglaloya
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_arreglaloya();

COMMIT;
