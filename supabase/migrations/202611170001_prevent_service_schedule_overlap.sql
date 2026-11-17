-- HU-F07: impedir que un trabajador tenga servicios activos superpuestos.
-- No se corrigen horarios existentes automáticamente: se informa el conflicto.
create extension if not exists btree_gist;

do $$
begin
  if exists (
    select 1
    from public.services first_service
    join public.services second_service
      on first_service.worker_id = second_service.worker_id
     and first_service.id < second_service.id
     and tstzrange(first_service.scheduled_start, first_service.scheduled_end, '[)')
         && tstzrange(second_service.scheduled_start, second_service.scheduled_end, '[)')
    where first_service.status in ('scheduled', 'in_progress')
      and second_service.status in ('scheduled', 'in_progress')
      and first_service.scheduled_start is not null
      and first_service.scheduled_end is not null
      and second_service.scheduled_start is not null
      and second_service.scheduled_end is not null
  ) then
    raise exception 'Hay servicios activos con horarios superpuestos. Corrígelos antes de aplicar la restricción HU-F07.';
  end if;
end;
$$;

alter table public.services
  add constraint services_worker_schedule_no_overlap
  exclude using gist (
    worker_id with =,
    tstzrange(scheduled_start, scheduled_end, '[)') with &&
  )
  where (
    status in ('scheduled', 'in_progress')
    and scheduled_start is not null
    and scheduled_end is not null
  );
