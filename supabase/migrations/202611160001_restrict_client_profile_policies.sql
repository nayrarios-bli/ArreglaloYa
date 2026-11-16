-- Ajusta permisos que ya pudieron aplicarse en
-- 202611140002_create_auth_rls_policies.sql.
-- Solo los clientes pueden consultar o editar su propio perfil de cliente.

BEGIN;

REVOKE INSERT (user_id, home_zone_id, exact_address)
ON TABLE public.client_profiles
FROM authenticated;

DROP POLICY IF EXISTS client_profiles_insert_own
ON public.client_profiles;

DROP POLICY IF EXISTS client_profiles_select_own
ON public.client_profiles;

CREATE POLICY client_profiles_select_own
ON public.client_profiles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'client'
    )
);

DROP POLICY IF EXISTS client_profiles_update_own
ON public.client_profiles;

CREATE POLICY client_profiles_update_own
ON public.client_profiles
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'client'
    )
)
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'client'
    )
);

COMMIT;
