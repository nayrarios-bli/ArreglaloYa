create or replace function public.submit_service_quote(
  p_service_id uuid,
  p_worker_id uuid,
  p_quote_type text,
  p_amount numeric,
  p_notes text
)
returns table (
  id uuid,
  service_id uuid,
  quote_type text,
  amount numeric,
  notes text,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_worker_id uuid;
  v_status public.service_status;
  v_requires_visit boolean;
  v_quote public.service_quotes%rowtype;
begin
  if p_quote_type not in ('transport', 'final') then
    raise exception 'INVALID_QUOTE_TYPE';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select s.worker_id, s.status, o.requires_visit
    into v_worker_id, v_status, v_requires_visit
  from public.services s
  join public.offers o on o.id = s.offer_id
  where s.id = p_service_id
  for update of s;

  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  if v_worker_id <> p_worker_id then
    raise exception 'NOT_SERVICE_WORKER';
  end if;

  if not v_requires_visit then
    raise exception 'SERVICE_DOES_NOT_REQUIRE_VISIT';
  end if;

  if v_status not in ('scheduled', 'in_progress') then
    raise exception 'SERVICE_NOT_SCHEDULED';
  end if;

  if exists (
    select 1
    from public.service_quotes q
    where q.service_id = p_service_id
      and q.quote_type = p_quote_type
  ) then
    raise exception 'QUOTE_ALREADY_EXISTS';
  end if;

  if p_quote_type = 'final' and not exists (
    select 1
    from public.service_quotes q
    where q.service_id = p_service_id
      and q.quote_type = 'transport'
  ) then
    raise exception 'TRANSPORT_QUOTE_REQUIRED';
  end if;

  insert into public.service_quotes (
    service_id,
    quote_type,
    amount,
    notes,
    created_by
  )
  values (
    p_service_id,
    p_quote_type,
    p_amount,
    nullif(trim(p_notes), ''),
    p_worker_id
  )
  returning * into v_quote;

  insert into public.service_events (
    service_id,
    actor_id,
    event_type,
    details
  )
  values (
    p_service_id,
    p_worker_id,
    case
      when p_quote_type = 'transport' then 'transport_quote_submitted'
      else 'final_quote_submitted'
    end,
    jsonb_build_object(
      'quoteId', v_quote.id,
      'amount', v_quote.amount,
      'notes', v_quote.notes
    )
  );

  return query
  select
    v_quote.id,
    v_quote.service_id,
    v_quote.quote_type,
    v_quote.amount,
    v_quote.notes,
    v_quote.created_by,
    v_quote.created_at;
end;
$$;


create or replace function public.decide_final_service_quote(
  p_service_id uuid,
  p_quote_id uuid,
  p_client_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_client_id uuid;
  v_request_id uuid;
  v_status public.service_status;
  v_amount numeric(12, 2);
  v_quote_type text;
begin
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select s.client_id, s.request_id, s.status
    into v_client_id, v_request_id, v_status
  from public.services s
  where s.id = p_service_id
  for update;

  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  if v_client_id <> p_client_id then
    raise exception 'NOT_SERVICE_CLIENT';
  end if;

  if v_status in ('cancelled', 'completed') then
    raise exception 'SERVICE_NOT_ACTIVE';
  end if;

  select q.amount, q.quote_type
    into v_amount, v_quote_type
  from public.service_quotes q
  where q.id = p_quote_id
    and q.service_id = p_service_id;

  if not found or v_quote_type <> 'final' then
    raise exception 'FINAL_QUOTE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.service_events e
    where e.service_id = p_service_id
      and e.event_type in (
        'final_quote_accepted',
        'final_quote_rejected'
      )
      and e.details ->> 'quoteId' = p_quote_id::text
  ) then
    raise exception 'QUOTE_ALREADY_DECIDED';
  end if;

  if p_decision = 'accepted' then
    update public.services
    set final_amount = v_amount
    where id = p_service_id;

    insert into public.service_events (
      service_id,
      actor_id,
      event_type,
      details
    )
    values (
      p_service_id,
      p_client_id,
      'final_quote_accepted',
      jsonb_build_object(
        'quoteId', p_quote_id,
        'amount', v_amount
      )
    );

    return jsonb_build_object(
      'serviceId', p_service_id,
      'quoteId', p_quote_id,
      'decision', p_decision,
      'finalAmount', v_amount
    );
  end if;

  update public.services
  set status = 'cancelled'
  where id = p_service_id;

  update public.repair_requests
  set status = 'cancelled'
  where id = v_request_id;

  insert into public.service_cancellations (
    service_id,
    cancelled_by,
    reason
  )
  values (
    p_service_id,
    p_client_id,
    'El cliente rechazó la cotización definitiva.'
  );

  insert into public.service_events (
    service_id,
    actor_id,
    event_type,
    details
  )
  values (
    p_service_id,
    p_client_id,
    'final_quote_rejected',
    jsonb_build_object(
      'quoteId', p_quote_id,
      'amount', v_amount
    )
  );

  return jsonb_build_object(
    'serviceId', p_service_id,
    'quoteId', p_quote_id,
    'decision', p_decision,
    'finalAmount', null
  );
end;
$$;


revoke all on function public.submit_service_quote(
  uuid, uuid, text, numeric, text
) from public, anon, authenticated;

grant execute on function public.submit_service_quote(
  uuid, uuid, text, numeric, text
) to service_role;


revoke all on function public.decide_final_service_quote(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.decide_final_service_quote(
  uuid, uuid, uuid, text
) to service_role;