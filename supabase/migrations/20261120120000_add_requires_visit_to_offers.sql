begin;

alter table public.offers
  add column if not exists requires_visit boolean;

-- Older offers did not record whether a visit was required.
-- Use false as the backward-compatible default for those existing rows.
update public.offers
set requires_visit = false
where requires_visit is null;

alter table public.offers
  alter column requires_visit set default false,
  alter column requires_visit set not null;

commit;
