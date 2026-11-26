-- Panel de reportes de servicios (rama feature/sofia-rojas).
--
-- 1. Guarda cada reporte generado por un administrador: quién lo generó,
--    el período y la categoría consultados, y los totales obtenidos.
--    Sirve como historial y como evidencia (trazabilidad) de los resultados.
create table public.service_report_queries (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  total_requests integer not null check (total_requests >= 0),
  completed_services integer not null check (completed_services >= 0),
  cancelled_services integer not null check (cancelled_services >= 0),
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date < 366)
);

create index service_report_queries_admin_idx
  on public.service_report_queries(admin_id, created_at desc);

-- RLS sin políticas: el navegador no puede leer ni escribir esta tabla.
-- Solo NestJS accede con la clave secreta, después de validar sesión y rol.
alter table public.service_report_queries enable row level security;

-- 2. Índices para que los filtros por fecha del reporte sean rápidos.
create index if not exists repair_requests_created_at_idx
  on public.repair_requests(created_at);

create index if not exists services_completed_at_idx
  on public.services(completed_at)
  where status = 'completed';

create index if not exists service_cancellations_created_at_idx
  on public.service_cancellations(created_at);
