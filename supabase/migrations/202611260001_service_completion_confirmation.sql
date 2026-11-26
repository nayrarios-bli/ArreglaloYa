alter table public.services
  add column completion_status text not null default 'not_requested'
    check (completion_status in ('not_requested', 'pending', 'approved', 'rejected')),
  add column completion_requested_at timestamptz,
  add column completion_decided_at timestamptz;

-- Evita que el flujo anterior cambie el servicio directamente a completed.
-- El paso a completed solo se permitirá al aprobar la solicitud.
create or replace function public.transition_service_status(
  p_service_id uuid,
  p_actor_id uuid,
  p_new_status public.service_status
)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services;
begin
  select * into v_service
  from public.services
  where id = p_service_id
  for update;

  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  if v_service.worker_id <> p_actor_id then
    raise exception 'service_forbidden' using errcode = '42501';
  end if;

  if not (v_service.status = 'scheduled' and p_new_status = 'in_progress') then
    raise exception 'invalid_service_transition' using errcode = '22023';
  end if;

  update public.services
  set status = p_new_status,
      started_at = now()
  where id = p_service_id
  returning * into v_service;

  insert into public.service_events(service_id, actor_id, event_type, details)
  values (
    p_service_id,
    p_actor_id,
    'in_progress',
    jsonb_build_object('previous_status', 'scheduled')
  );

  return v_service;
end;
$$;

revoke all on function public.transition_service_status(uuid, uuid, public.service_status)
  from public, anon, authenticated;
grant execute on function public.transition_service_status(uuid, uuid, public.service_status)
  to service_role;


create or replace function public.request_service_completion(
  p_service_id uuid,
  p_worker_id uuid
)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services;
begin
  select * into v_service
  from public.services
  where id = p_service_id
  for update;

  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  if v_service.worker_id <> p_worker_id then
    raise exception 'service_forbidden' using errcode = '42501';
  end if;

  if v_service.status <> 'in_progress'
    or v_service.final_amount is null
    or v_service.completion_status = 'pending'
    or (
      exists (
        select 1
        from public.offers
        where id = v_service.offer_id and requires_visit
      )
      and not exists (
        select 1
        from public.service_events
        where service_id = p_service_id
          and event_type = 'final_quote_accepted'
      )
    )
  then
    raise exception 'service_not_ready' using errcode = '22023';
  end if;

  update public.services
  set completion_status = 'pending',
      completion_requested_at = now(),
      completion_decided_at = null
  where id = p_service_id
  returning * into v_service;

  insert into public.service_events(service_id, actor_id, event_type, details)
  values (p_service_id, p_worker_id, 'completion_requested', '{}'::jsonb);

  return v_service;
end;
$$;

revoke all on function public.request_service_completion(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.request_service_completion(uuid, uuid)
  to service_role;


create or replace function public.decide_service_completion(
  p_service_id uuid,
  p_client_id uuid,
  p_decision text
)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services;
begin
  select * into v_service
  from public.services
  where id = p_service_id
  for update;

  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  if v_service.client_id <> p_client_id then
    raise exception 'service_forbidden' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected')
    or v_service.status <> 'in_progress'
    or v_service.completion_status <> 'pending'
  then
    raise exception 'invalid_completion_decision' using errcode = '22023';
  end if;

  update public.services
  set completion_status = p_decision,
      completion_decided_at = now(),
      status = case
        when p_decision = 'approved' then 'completed'::public.service_status
        else status
      end,
      completed_at = case
        when p_decision = 'approved' then now()
        else completed_at
      end
  where id = p_service_id
  returning * into v_service;

  insert into public.service_events(service_id, actor_id, event_type, details)
  values (
    p_service_id,
    p_client_id,
    case when p_decision = 'approved'
      then 'completion_approved'
      else 'completion_rejected'
    end,
    jsonb_build_object('decision', p_decision)
  );

  return v_service;
end;
$$;

revoke all on function public.decide_service_completion(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.decide_service_completion(uuid, uuid, text)
  to service_role;


-- El flujo por código ya no se utiliza.
drop function if exists public.complete_service_with_code(uuid, uuid, text);
drop function if exists public.issue_service_completion_code(uuid, uuid, text);
drop table if exists public.service_completion_codes;