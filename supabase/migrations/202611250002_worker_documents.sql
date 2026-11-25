-- Documentación privada para la revisión de perfiles de trabajadores.
-- Las cargas y lecturas se realizan únicamente desde NestJS usando la clave secreta.

create table if not exists public.worker_documents (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(user_id) on delete cascade,
  document_type text not null check (document_type in ('identity_card', 'criminal_record')),
  storage_path text not null unique,
  uploaded_at timestamptz not null default now(),
  constraint worker_documents_worker_type_unique unique (worker_id, document_type)
);

create index if not exists worker_documents_worker_id_idx
  on public.worker_documents(worker_id);

alter table public.worker_documents enable row level security;
revoke all on public.worker_documents from anon, authenticated;
grant select, insert, update, delete on public.worker_documents to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'worker-documents',
  'worker-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
