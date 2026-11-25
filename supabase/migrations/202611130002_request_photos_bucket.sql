-- HU-F01: bucket privado para las imágenes de las solicitudes.
-- NestJS subirá los objetos con SUPABASE_SECRET_KEY después de validar
-- la sesión y que la solicitud pertenezca al cliente.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'request-photos',
  'request-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
