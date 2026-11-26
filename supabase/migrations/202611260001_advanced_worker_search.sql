
-- Buscador avanzado de trabajadores.
-- Filtros opcionales: categoría, calificación mínima y disponibilidad semanal.
-- Ordenamiento por calificación descendente y paginación desde PostgreSQL.

CREATE OR REPLACE FUNCTION public.search_workers(
  p_category_id uuid DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_weekday smallint DEFAULT NULL,
  p_starts_at time DEFAULT NULL,
  p_ends_at time DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_items jsonb;
  v_offset integer;
BEGIN
  -- Validaciones de parámetros
  IF p_min_rating IS NOT NULL
     AND (p_min_rating < 1 OR p_min_rating > 5) THEN
    RAISE EXCEPTION 'La calificación debe estar entre 1 y 5.';
  END IF;

  IF p_weekday IS NOT NULL
     AND (p_weekday < 0 OR p_weekday > 6) THEN
    RAISE EXCEPTION 'El día debe estar entre 0 y 6.';
  END IF;

  IF (p_weekday IS NULL AND
      (p_starts_at IS NOT NULL OR p_ends_at IS NOT NULL))
     OR
     (p_weekday IS NOT NULL AND
      (p_starts_at IS NULL OR p_ends_at IS NULL)) THEN
    RAISE EXCEPTION 'Debes proporcionar día, hora de inicio y hora de fin.';
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'La hora de fin debe ser posterior a la hora de inicio.';
  END IF;

  IF p_page < 1 OR p_page_size < 1 OR p_page_size > 50 THEN
    RAISE EXCEPTION 'Parámetros de paginación no válidos.';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  -- Calcular calificación promedio de cada trabajador
  WITH worker_ratings AS (
    SELECT
      subject_id AS worker_id,
      AVG(score)::numeric AS average_rating,
      COUNT(*)::integer AS review_count
    FROM public.reviews
    GROUP BY subject_id
  ),

  -- Aplicar los filtros combinados
  filtered_workers AS (
    SELECT
      wp.user_id,
      p.full_name,
      wp.bio,
      wr.average_rating,
      COALESCE(wr.review_count, 0) AS review_count
    FROM public.worker_profiles wp
    INNER JOIN public.profiles p
      ON p.id = wp.user_id
    LEFT JOIN worker_ratings wr
      ON wr.worker_id = wp.user_id
    WHERE
      wp.review_status = 'approved'
      AND p.role = 'worker'

      -- Filtro por categoría
      AND (
        p_category_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.worker_categories wc
          WHERE wc.worker_id = wp.user_id
            AND wc.category_id = p_category_id
        )
      )

      -- Calificación mínima
      AND (
        p_min_rating IS NULL
        OR COALESCE(wr.average_rating, 0) >= p_min_rating
      )

      -- Disponibilidad semanal que cubra todo el intervalo
      AND (
        p_weekday IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.worker_availability wa
          WHERE wa.worker_id = wp.user_id
            AND wa.weekday = p_weekday
            AND wa.starts_at <= p_starts_at
            AND wa.ends_at >= p_ends_at
        )
      )
  )

  SELECT COUNT(*)::integer
  INTO v_total
  FROM filtered_workers;

  -- Obtener solamente los trabajadores de la página solicitada
  WITH worker_ratings AS (
    SELECT
      subject_id AS worker_id,
      AVG(score)::numeric AS average_rating,
      COUNT(*)::integer AS review_count
    FROM public.reviews
    GROUP BY subject_id
  ),

  filtered_workers AS (
    SELECT
      wp.user_id,
      p.full_name,
      wp.bio,
      wr.average_rating,
      COALESCE(wr.review_count, 0) AS review_count
    FROM public.worker_profiles wp
    INNER JOIN public.profiles p
      ON p.id = wp.user_id
    LEFT JOIN worker_ratings wr
      ON wr.worker_id = wp.user_id
    WHERE
      wp.review_status = 'approved'
      AND p.role = 'worker'
      AND (
        p_category_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.worker_categories wc
          WHERE wc.worker_id = wp.user_id
            AND wc.category_id = p_category_id
        )
      )
      AND (
        p_min_rating IS NULL
        OR COALESCE(wr.average_rating, 0) >= p_min_rating
      )
      AND (
        p_weekday IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.worker_availability wa
          WHERE wa.worker_id = wp.user_id
            AND wa.weekday = p_weekday
            AND wa.starts_at <= p_starts_at
            AND wa.ends_at >= p_ends_at
        )
      )
  ),

  page_workers AS (
    SELECT *
    FROM filtered_workers
    ORDER BY average_rating DESC NULLS LAST, full_name ASC, user_id ASC
    LIMIT p_page_size
    OFFSET v_offset
  )

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pw.user_id,
        'fullName', pw.full_name,
        'bio', pw.bio,
        'averageRating', ROUND(pw.average_rating, 1),
        'reviewCount', pw.review_count,
        'categories', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', c.id,
                'name', c.name
              )
              ORDER BY c.name
            ),
            '[]'::jsonb
          )
          FROM public.worker_categories wc
          INNER JOIN public.categories c
            ON c.id = wc.category_id
          WHERE wc.worker_id = pw.user_id
            AND c.is_active = true
        )
      )
      ORDER BY pw.average_rating DESC NULLS LAST,
               pw.full_name ASC,
               pw.user_id ASC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM page_workers pw;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', p_page,
    'pageSize', p_page_size,
    'totalPages', CEIL(v_total::numeric / p_page_size)
  );
END;
$$;

-- Restringir la ejecución de la función al backend.
REVOKE ALL ON FUNCTION public.search_workers(
  uuid,
  numeric,
  smallint,
  time,
  time,
  integer,
  integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_workers(
  uuid,
  numeric,
  smallint,
  time,
  time,
  integer,
  integer
) TO service_role;