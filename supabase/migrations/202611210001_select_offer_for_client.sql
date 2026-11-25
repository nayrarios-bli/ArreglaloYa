create or replace function public.select_offer_for_client(
  p_request_id uuid,
  p_offer_id uuid,
  p_client_id uuid
)
returns table (
  offer_id uuid,
  service_id uuid,
  final_amount numeric,
  requires_visit boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_request_client_id uuid;
  v_request_status text;
  v_request_expires_at timestamptz;
  v_worker_id uuid;
  v_amount numeric(12, 2);
  v_requires_visit boolean;
  v_service_id uuid;
begin
  select rr.client_id, rr.status, rr.expires_at
    into v_request_client_id, v_request_status, v_request_expires_at
  from public.repair_requests rr
  where rr.id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request_client_id <> p_client_id then
    raise exception 'NOT_REQUEST_OWNER';
  end if;

  if v_request_status <> 'open'
     or v_request_expires_at <= now() then
    raise exception 'REQUEST_NOT_OPEN';
  end if;

  select o.worker_id, o.estimated_amount, o.requires_visit
    into v_worker_id, v_amount, v_requires_visit
  from public.offers o
  where o.id = p_offer_id
    and o.request_id = p_request_id
    and o.status = 'submitted'
  for update;

  if not found then
    raise exception 'OFFER_NOT_AVAILABLE';
  end if;

  update public.offers
  set status = 'rejected'
  where request_id = p_request_id
    and status = 'submitted'
    and id <> p_offer_id;

  update public.offers
  set status = 'selected'
  where id = p_offer_id;

  insert into public.services (
    request_id,
    offer_id,
    client_id,
    worker_id,
    status,
    final_amount
  )
  values (
    p_request_id,
    p_offer_id,
    p_client_id,
    v_worker_id,
    'scheduled',
    case
      when v_requires_visit then null
      else v_amount
    end
  )
  returning id into v_service_id;

  update public.repair_requests
  set status = 'in_service'
  where id = p_request_id;

  return query
  select
    p_offer_id,
    v_service_id,
    case when v_requires_visit then null else v_amount end,
    v_requires_visit;
end;
$$;

revoke all on function public.select_offer_for_client(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.select_offer_for_client(uuid, uuid, uuid)
  to service_role;