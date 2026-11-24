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
  if not ((v_service.status = 'scheduled' and p_new_status = 'in_progress')
       or (v_service.status = 'in_progress' and p_new_status = 'completed')) then
    raise exception 'invalid_service_transition' using errcode = '22023';
  end if;

  update public.services
  set status = p_new_status,
      started_at = case when p_new_status = 'in_progress' then now() else started_at end,
      completed_at = case when p_new_status = 'completed' then now() else completed_at end
  where id = p_service_id
  returning * into v_service;

  insert into public.service_events(service_id, actor_id, event_type, details)
  values (p_service_id, p_actor_id, p_new_status::text,
          jsonb_build_object('previous_status', case when p_new_status = 'in_progress' then 'scheduled' else 'in_progress' end));
  return v_service;
end;
$$;

revoke all on function public.transition_service_status(uuid, uuid, public.service_status) from public, anon, authenticated;
grant execute on function public.transition_service_status(uuid, uuid, public.service_status) to service_role;
