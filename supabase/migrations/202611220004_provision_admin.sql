
-- =====================================================
-- HU-15: PROVISIONAMIENTO CONTROLADO DE ADMINISTRADORES
-- =====================================================

CREATE OR REPLACE FUNCTION public.provision_admin(
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

    -- Obtener y bloquear el usuario durante la operación.
    PERFORM pg_catalog.pg_advisory_xact_lock(741852963);

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

    -- Verificar que el backend haya autorizado la creación.
    IF v_provisioned_by IS DISTINCT FROM 'superadmin'
       OR v_app_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION
            'El usuario no tiene autorizacion para ser administrador';
    END IF;

    -- Comprobar que el perfil inicial sea de cliente.
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_user_id
          AND role = 'client'
    ) THEN
        RAISE EXCEPTION
            'El usuario no tiene un perfil inicial de cliente';
    END IF;

    -- Eliminar el perfil especifico temporal de cliente.
    DELETE FROM public.client_profiles
    WHERE user_id = p_user_id;

    -- Convertir el perfil general en administrador.
    UPDATE public.profiles
    SET
        role = 'admin',
        updated_at = pg_catalog.now()
    WHERE id = p_user_id
      AND role = 'client';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No se pudo actualizar el perfil del administrador';
    END IF;

END;
$function$;


-- =====================================================
-- SEGURIDAD: SOLO SERVICE_ROLE PUEDE EJECUTARLA
-- =====================================================

REVOKE ALL ON FUNCTION public.provision_admin(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.provision_admin(uuid)
TO service_role;
