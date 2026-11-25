
-- =====================================================
-- HU-15: INICIALIZACION CONTROLADA DEL SUPERADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION public.bootstrap_superadmin(
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN

    -- Evitar dos inicializaciones simultaneas.
    PERFORM pg_catalog.pg_advisory_xact_lock(741852963);

    -- Comprobar que el usuario exista en Supabase Auth.
    IF NOT EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = p_user_id
    ) THEN
        RAISE EXCEPTION 'El usuario indicado no existe';
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

    -- Impedir que se cree un segundo superadministrador.
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

    -- Convertir el perfil general en superadministrador.
    UPDATE public.profiles
    SET
        role = 'superadmin',
        updated_at = pg_catalog.now()
    WHERE id = p_user_id
      AND role = 'client';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No se pudo actualizar el perfil del superadministrador';
    END IF;

END;
$function$;


-- =====================================================
-- SEGURIDAD: SOLO EL BACKEND ADMINISTRATIVO
-- =====================================================

REVOKE ALL ON FUNCTION public.bootstrap_superadmin(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bootstrap_superadmin(uuid)
TO service_role;
