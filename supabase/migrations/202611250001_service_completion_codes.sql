create table public.service_completion_codes (
  service_id uuid primary key references public.services(id) on delete cascade,
  code_digest text not null,
  expires_at timestamptz not null,
  failed_attempts integer not null default 0
);

alter table public.service_completion_codes enable row level security;
revoke all on public.service_completion_codes from anon, authenticated;
grant select, insert, update, delete on public.service_completion_codes to service_role;

create function public.issue_service_completion_code(
  p_service_id uuid, p_client_id uuid, p_code_digest text
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_service public.services;
  v_expiry timestamptz := now() + interval '15 minutes';
begin
  select * into v_service from public.services
  where id = p_service_id and client_id = p_client_id
  for update;

  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;
  if v_service.status <> 'in_progress' or v_service.final_amount is null
    or (exists (
      select 1 from public.offers where id = v_service.offer_id and requires_visit
    ) and not exists (
      select 1 from public.service_events
      where service_id = p_service_id and event_type = 'final_quote_accepted'
    )) then
    raise exception 'service_not_ready' using errcode = '22023';
  end if;

  insert into public.service_completion_codes (service_id, code_digest, expires_at)
  values (p_service_id, p_code_digest, v_expiry)
  on conflict (service_id) do update set
    code_digest = excluded.code_digest, expires_at = excluded.expires_at, failed_attempts = 0;
  return v_expiry;
end;
$$;

revoke all on function public.issue_service_completion_code(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.issue_service_completion_code(uuid, uuid, text) to service_role;

create function public.complete_service_with_code(
  p_service_id uuid,
  p_worker_id uuid,
  p_code_digest text
)
returns public.services
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_service public.services;
begin
  select * into v_service
  from public.services
  where id = p_service_id and worker_id = p_worker_id
  for update;

  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  delete from public.service_completion_codes
  where service_id = p_service_id
    and code_digest = p_code_digest
    and expires_at > now()
    and failed_attempts < 5;

  if not found then
    update public.service_completion_codes
    set failed_attempts = failed_attempts + 1
    where service_id = p_service_id
      and expires_at > now()
      and failed_attempts < 5;
    return null;
  end if;

  return public.transition_service_status(p_service_id, p_worker_id, 'completed');
end;
$$;

revoke all on function public.complete_service_with_code(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_service_with_code(uuid, uuid, text) to service_role;
