-- ArreglaloYa: esquema inicial basado en los RF del documento.
-- Los estados/campos con reglas pendientes se mantienen flexibles y deben revisarse.

create extension if not exists pgcrypto;

create type public.app_role as enum ('client', 'worker', 'admin', 'superadmin');
create type public.worker_review_status as enum ('pending', 'approved', 'rejected');
create type public.request_status as enum ('draft', 'open', 'in_service', 'completed', 'cancelled', 'expired');
create type public.offer_status as enum ('submitted', 'withdrawn', 'selected', 'rejected');
create type public.service_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type public.price_change_status as enum ('pending', 'approved', 'rejected');
create type public.complaint_status as enum ('open', 'in_review', 'resolved', 'closed');

-- La autenticación y las credenciales pertenecen a Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text not null default 'Cochabamba',
  is_active boolean not null default true
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true
);

create table public.client_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  home_zone_id uuid references public.service_zones(id),
  -- Mantener dirección exacta fuera de respuestas públicas; acceso por backend autorizado.
  exact_address text
);

create table public.worker_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  review_status public.worker_review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text
);

create table public.worker_categories (
  worker_id uuid not null references public.worker_profiles(user_id) on delete cascade,
  category_id uuid not null references public.categories(id),
  primary key (worker_id, category_id)
);

create table public.worker_zones (
  worker_id uuid not null references public.worker_profiles(user_id) on delete cascade,
  zone_id uuid not null references public.service_zones(id),
  primary key (worker_id, zone_id)
);

create table public.worker_availability (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (ends_at > starts_at)
);

create table public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(user_id),
  category_id uuid not null references public.categories(id),
  zone_id uuid not null references public.service_zones(id),
  title text not null,
  description text not null,
  status public.request_status not null default 'open',
  available_from timestamptz,
  available_until timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_until is null or available_from is null or available_until > available_from)
);

create index repair_requests_match_idx on public.repair_requests(category_id, zone_id, status);
create index repair_requests_expiry_idx on public.repair_requests(expires_at) where status = 'open';

create table public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.repair_requests(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.repair_requests(id),
  worker_id uuid not null references public.worker_profiles(user_id),
  message text,
  estimated_amount numeric(12,2) check (estimated_amount is null or estimated_amount >= 0),
  status public.offer_status not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (request_id, worker_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.repair_requests(id),
  offer_id uuid not null unique references public.offers(id),
  client_id uuid not null references public.client_profiles(user_id),
  worker_id uuid not null references public.worker_profiles(user_id),
  status public.service_status not null default 'scheduled',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  final_amount numeric(12,2) check (final_amount is null or final_amount >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (scheduled_end is null or scheduled_start is null or scheduled_end > scheduled_start)
);

create table public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  quote_type text not null check (quote_type in ('estimate', 'transport', 'final')),
  amount numeric(12,2) not null check (amount >= 0),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.price_change_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  requested_by uuid not null references public.worker_profiles(user_id),
  reason text not null,
  additional_amount numeric(12,2) not null check (additional_amount > 0),
  status public.price_change_status not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.service_cancellations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references public.services(id),
  cancelled_by uuid not null references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create table public.payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  confirmed_by uuid not null references public.profiles(id),
  declared_amount numeric(12,2) not null check (declared_amount >= 0),
  method text check (method in ('cash', 'qr', 'other')),
  confirmed_at timestamptz not null default now(),
  unique (service_id, confirmed_by)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  author_id uuid not null references public.profiles(id),
  subject_id uuid not null references public.profiles(id),
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  check (author_id <> subject_id),
  unique (service_id, author_id)
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  opened_by uuid not null references public.profiles(id),
  description text not null,
  status public.complaint_status not null default 'open',
  assigned_to uuid references public.profiles(id),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_events (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Catálogo inicial descrito en el alcance del MVP.
insert into public.categories (name) values
  ('Plomería'), ('Electricidad'), ('Albañilería'), ('Reparación de electrodomésticos')
on conflict (name) do nothing;

insert into public.service_zones (name) values ('Por definir')
on conflict (name) do nothing;

-- Esta migración crea el esquema, pero no concede acceso directo desde el navegador.
-- Las políticas RLS y permisos se agregarán tras definir el modelo de acceso.
