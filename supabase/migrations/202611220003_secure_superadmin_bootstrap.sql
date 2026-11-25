
CREATE OR REPLACE FUNCTION public.bootstrap_superadmin(
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_provisioned_by text;
    v_app_role text;
BEGIN
    -- Evitar inicializaciones simultaneas.
    PERFORM pg_catalog.pg_advisory_xact_lock(741852963);

    -- Comprobar que el usuario exista y tenga los
    -- metadatos administrativos autorizados.
    SELECT
        raw_app_meta_data ->> 'provisioned_by',
        raw_app_meta_data ->> 'role'
    INTO
        v_provisioned_by,
        v_app_role
    FROM auth.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario no existe';
    END IF;

    IF v_provisioned_by IS DISTINCT FROM 'bootstrap'
       OR v_app_role IS DISTINCT FROM 'superadmin' THEN
        RAISE EXCEPTION
            'El usuario no tiene autorizacion para ser superadmin';
    END IF;

    -- Comprobar que tenga un perfil inicial de cliente.
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_user_id
          AND role = 'client'
    ) THEN
        RAISE EXCEPTION
            'El usuario no tiene un perfil inicial de cliente';
    END IF;

    -- Impedir un segundo superadministrador.
    IF EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE role = 'superadmin'
    ) THEN
        RAISE EXCEPTION
            'Ya existe un superadministrador';
    END IF;

    -- Eliminar el perfil especifico temporal de cliente.
    DELETE FROM public.client_profiles
    WHERE user_id = p_user_id;

    -- Convertir el perfil general.
    UPDATE public.profiles
    SET
        role = 'superadmin',
        updated_at = pg_catalog.now()
    WHERE id = p_user_id
      AND role = 'client';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No se pudo actualizar el perfil';
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.bootstrap_superadmin(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bootstrap_superadmin(uuid)
TO service_role;
