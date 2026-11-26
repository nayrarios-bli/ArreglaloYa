-- El importe base queda registrado para poder reconstruir cada propuesta.
alter table public.price_change_requests
  add column base_amount numeric(12,2) check (base_amount >= 0);

revoke all on public.price_change_requests from public, anon, authenticated;
grant select, insert, update on public.price_change_requests to service_role;

create function public.request_service_price_change(
  p_service_id uuid, p_worker_id uuid, p_amount numeric, p_reason text
)
returns public.price_change_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_service public.services;
  v_change public.price_change_requests;
  v_reason text := regexp_replace(p_reason, '^[[:space:]]+|[[:space:]]+$', '', 'g');
begin
  select * into v_service from public.services
  where id = p_service_id and worker_id = p_worker_id for update;

  if not found then
    raise exception 'Servicio no encontrado' using errcode = 'P0002';
  end if;
  if v_service.status not in ('scheduled', 'in_progress') or v_service.final_amount is null then
    raise exception 'Se requiere un servicio activo con precio acordado' using errcode = '55000';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2)
    or p_amount + v_service.final_amount > 9999999999.99
    or v_reason is null or char_length(v_reason) not between 10 and 500 then
    raise exception 'Aumento o justificación no válidos' using errcode = '22023';
  end if;
  if exists (select 1 from public.price_change_requests
    where service_id = p_service_id and status = 'pending') then
    raise exception 'Ya hay un aumento pendiente' using errcode = '55000';
  end if;

  insert into public.price_change_requests (service_id, requested_by, reason, additional_amount, base_amount)
  values (p_service_id, p_worker_id, v_reason, p_amount, v_service.final_amount)
  returning * into v_change;
  return v_change;
end;
$$;

create function public.decide_service_price_change(
  p_service_id uuid, p_change_id uuid, p_client_id uuid, p_approve boolean
)
returns public.price_change_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_service public.services;
  v_change public.price_change_requests;
begin
  select * into v_service from public.services
  where id = p_service_id and client_id = p_client_id for update;

  if not found then
    raise exception 'Servicio no encontrado' using errcode = 'P0002';
  end if;
  if v_service.status not in ('scheduled', 'in_progress') or v_service.final_amount is null then
    raise exception 'El servicio ya no admite cambios de precio' using errcode = '55000';
  end if;

  select * into v_change from public.price_change_requests
  where id = p_change_id and service_id = p_service_id for update;
  if not found then
    raise exception 'Aumento no encontrado' using errcode = 'P0002';
  end if;
  if v_change.status <> 'pending' then
    raise exception 'El aumento ya fue respondido' using errcode = '55000';
  end if;
  if p_approve is null then
    raise exception 'Decisión no válida' using errcode = '22023';
  end if;

  if p_approve then
    if v_change.base_amount is distinct from v_service.final_amount then
      raise exception 'El precio base cambió. Rechaza esta solicitud y pide una nueva' using errcode = '55000';
    end if;
    update public.services set final_amount = final_amount + v_change.additional_amount
    where id = p_service_id;
    -- El código anterior correspondía al importe previo.
    delete from public.service_completion_codes where service_id = p_service_id;
  end if;

  update public.price_change_requests
  set status = (case when p_approve then 'approved' else 'rejected' end)::public.price_change_status,
      decided_at = now()
  where id = p_change_id returning * into v_change;
  return v_change;
end;
$$;

revoke all on function public.request_service_price_change(uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.decide_service_price_change(uuid, uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.request_service_price_change(uuid, uuid, numeric, text) to service_role;
grant execute on function public.decide_service_price_change(uuid, uuid, uuid, boolean) to service_role;
