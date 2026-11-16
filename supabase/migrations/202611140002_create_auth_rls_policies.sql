
BEGIN;

-- =====================================================
-- 1. ASEGURAR QUE RLS ESTE HABILITADO
-- =====================================================

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.client_profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.worker_profiles
ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 2. REVOCAR PERMISOS GENERALES
-- =====================================================

REVOKE ALL PRIVILEGES
ON TABLE public.profiles,
         public.client_profiles,
         public.worker_profiles
FROM anon, authenticated;


-- =====================================================
-- 3. REVOCAR PERMISOS DIRECTOS POR COLUMNA
-- =====================================================

-- PROFILES
REVOKE ALL PRIVILEGES (
    id,
    role,
    full_name,
    phone,
    created_at,
    updated_at
)
ON TABLE public.profiles
FROM anon, authenticated;

-- CLIENT_PROFILES
REVOKE ALL PRIVILEGES (
    user_id,
    home_zone_id,
    exact_address
)
ON TABLE public.client_profiles
FROM anon, authenticated;

-- WORKER_PROFILES
REVOKE ALL PRIVILEGES (
    user_id,
    bio,
    review_status,
    reviewed_by,
    reviewed_at,
    review_notes
)
ON TABLE public.worker_profiles
FROM anon, authenticated;


-- =====================================================
-- 4. CONCEDER PERMISOS DE LECTURA
-- =====================================================

GRANT SELECT
ON TABLE public.profiles,
         public.client_profiles,
         public.worker_profiles
TO authenticated;


-- =====================================================
-- 5. CONCEDER PERMISOS DE ACTUALIZACION LIMITADOS
-- =====================================================

-- Datos personales
GRANT UPDATE (full_name, phone)
ON TABLE public.profiles
TO authenticated;

-- Datos del perfil de cliente
GRANT UPDATE (home_zone_id, exact_address)
ON TABLE public.client_profiles
TO authenticated;

-- Biografia del trabajador
GRANT UPDATE (bio)
ON TABLE public.worker_profiles
TO authenticated;


-- =====================================================
-- 6. PERMITIR CREAR EL PERFIL PROPIO DE CLIENTE
-- =====================================================

GRANT INSERT (user_id, home_zone_id, exact_address)
ON TABLE public.client_profiles
TO authenticated;


-- =====================================================
-- 7. POLITICAS RLS: PROFILES
-- =====================================================

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);


-- =====================================================
-- 8. POLITICAS RLS: CLIENT_PROFILES
-- =====================================================

-- Consultar perfil propio
-- Se permite tanto a clientes como a trabajadores
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
          AND profiles.role IN ('client', 'worker')
    )
);

-- Crear perfil propio
CREATE POLICY client_profiles_insert_own
ON public.client_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('client', 'worker')
    )
);

-- Actualizar perfil propio
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
          AND profiles.role IN ('client', 'worker')
    )
)
WITH CHECK (
    user_id = auth.uid()
);


-- =====================================================
-- 9. POLITICAS RLS: WORKER_PROFILES
-- =====================================================

-- Consultar perfil propio
CREATE POLICY worker_profiles_select_own
ON public.worker_profiles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- Actualizar perfil propio
CREATE POLICY worker_profiles_update_own
ON public.worker_profiles
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'worker'
    )
)
WITH CHECK (
    user_id = auth.uid()
);


COMMIT;
