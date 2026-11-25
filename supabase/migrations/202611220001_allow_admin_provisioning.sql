
BEGIN;

-- =====================================================
-- 1. GARANTIZAR UN UNICO SUPERADMINISTRADOR
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_superadmin_idx
ON public.profiles (role)
WHERE role = 'superadmin';


-- =====================================================
-- 2. ACTUALIZAR LA FUNCION DE CREACION DE PERFILES
-- =====================================================

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
    v_provisioned_by text;
    v_app_role text;
BEGIN

    -- Obtener los datos personales del usuario.
    v_full_name := NULLIF(
        BTRIM(NEW.raw_user_meta_data ->> 'full_name'),
        ''
    );

    v_phone := NULLIF(
        BTRIM(NEW.raw_user_meta_data ->> 'phone'),
        ''
    );

    -- Obtener los metadatos administrativos.
    v_provisioned_by := COALESCE(
        NEW.raw_app_meta_data ->> 'provisioned_by',
        ''
    );

    v_app_role := COALESCE(
        NEW.raw_app_meta_data ->> 'role',
        ''
    );


    -- =================================================
    -- 3. CREACION AUTORIZADA DE ADMINISTRADORES
    -- =================================================

    IF v_provisioned_by = 'superadmin'
       AND v_app_role = 'admin' THEN

        v_role := 'admin';


    -- =================================================
    -- 4. INICIALIZACION DEL PRIMER SUPERADMINISTRADOR
    -- =================================================

    ELSIF v_provisioned_by = 'bootstrap'
          AND v_app_role = 'superadmin' THEN

        -- Evitar inicializaciones simultaneas.
        PERFORM pg_catalog.pg_advisory_xact_lock(741852963);

        -- Comprobar que todavia no exista un superadmin.
        IF EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE role = 'superadmin'
        ) THEN
            RAISE EXCEPTION
                'Ya existe un superadministrador inicializado';
        END IF;

        v_role := 'superadmin';


    -- =================================================
    -- 5. REGISTRO PUBLICO
    -- =================================================

    ELSE

        v_role := COALESCE(
            NEW.raw_user_meta_data ->> 'role',
            ''
        );

        IF v_role NOT IN ('client', 'worker') THEN
            RAISE EXCEPTION
                'Rol de registro no permitido';
        END IF;

    END IF;


    -- =================================================
    -- 6. VALIDAR DATOS PERSONALES
    -- =================================================

    IF v_full_name IS NULL THEN
        RAISE EXCEPTION
            'El nombre completo es obligatorio';
    END IF;


    -- =================================================
    -- 7. CREAR PERFIL GENERAL
    -- =================================================

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


    -- =================================================
    -- 8. CREAR PERFILES ESPECIFICOS
    -- =================================================

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


-- =====================================================
-- 9. RESTRINGIR EL ACCESO DIRECTO A LA FUNCION
-- =====================================================

REVOKE ALL ON FUNCTION public.handle_new_user_arreglaloya()
FROM PUBLIC, anon, authenticated;

COMMIT;
