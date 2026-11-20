-- El acceso a las tablas del MVP pasa por la API NestJS.
-- La clave secreta del servidor omite RLS; la API debe validar sesión, rol y propiedad.
-- Sin políticas, anon y authenticated no reciben acceso directo a estas tablas.

alter table public.profiles enable row level security;
alter table public.service_zones enable row level security;
alter table public.categories enable row level security;
alter table public.client_profiles enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.worker_categories enable row level security;
alter table public.worker_zones enable row level security;
alter table public.worker_availability enable row level security;
alter table public.repair_requests enable row level security;
alter table public.request_attachments enable row level security;
alter table public.offers enable row level security;
alter table public.services enable row level security;
alter table public.service_quotes enable row level security;
alter table public.price_change_requests enable row level security;
alter table public.service_cancellations enable row level security;
alter table public.payment_confirmations enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.service_events enable row level security;
