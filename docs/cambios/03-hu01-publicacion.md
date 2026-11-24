# HU-F01: publicación de solicitudes

## Estado

La pantalla Angular está conectada a la sesión de HU-F16, a la API NestJS y al bucket privado `request-photos`. Un cliente autenticado puede crear una solicitud y adjuntar imágenes. Al enviar el formulario, la zona elegida se valida y se guarda como zona del perfil del cliente. HU-F02 no forma parte de esta entrega.

## Endpoints de HU-F01

| Método y ruta | Acceso | Comportamiento |
|---|---|---|
| `GET /catalog/categories` | Público | Lista categorías activas para el formulario. |
| `GET /catalog/zones` | Público | Lista zonas activas para el formulario. |
| `GET /requests/profile-zone` | Sesión Supabase con rol `client` | Devuelve la zona guardada en el perfil del cliente, si existe. |
| `POST /requests` | Sesión Supabase con rol `client` | Valida categoría y zona activas, guarda la zona seleccionada en el perfil y crea la solicitud. |
| `POST /requests/:requestId/attachments` | Sesión Supabase con rol `client` | Sube una imagen JPEG, PNG o WebP de hasta 10 MB, si la solicitud pertenece al cliente. Recibe multipart con campo `file`, guarda la ruta y devuelve un enlace firmado por una hora. |

Las imágenes se guardan en Supabase Storage y `request_attachments` registra el `storage_path`, no una URL pública permanente. La zona se envía como UUID; la API comprueba que esté activa y la guarda en `client_profiles.home_zone_id` antes de crear la solicitud.

### Ejemplo para crear una solicitud

```json
{
  "categoryId": "uuid-de-categoria",
  "zoneId": "uuid-de-zona",
  "title": "Fuga debajo del lavaplatos",
  "description": "La conexión pierde agua cuando se abre el grifo.",
  "availableFrom": "2026-11-14T13:00:00.000Z",
  "availableUntil": "2026-11-14T17:00:00.000Z"
}
```

Los horarios son opcionales. Si se envían ambos, el final debe ser posterior al inicio. Para adjuntar fotos, primero se crea la solicitud y luego se sube cada foto a `/requests/:requestId/attachments`.

## Reglas aplicadas

- NestJS valida el token Bearer con Supabase Auth y obtiene el rol desde `profiles`.
- Solo un cliente con perfil puede crear solicitudes; la zona seleccionada debe estar activa y se guarda en su perfil.
- La categoría debe estar activa.
- Solo el cliente dueño de la solicitud puede adjuntar archivos.
- La API acepta JPEG, PNG y WebP de hasta 10 MB y valida la firma básica del archivo además del MIME declarado.
- El bucket es privado; los enlaces temporales duran una hora.

## Configuración

Cada integrante copia `apps/api/.env.example` como `apps/api/.env` y configura `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SUPABASE_PUBLISHABLE_KEY`. La clave secreta solo se usa en NestJS. El nombre del bucket puede cambiarse con `SUPABASE_REQUEST_PHOTOS_BUCKET`. `main.ts` carga el archivo desde `apps/api/.env` tanto en desarrollo como en el build.

La migración `202611130002_request_photos_bucket.sql` crea el bucket privado `request-photos`. La migración de RLS del esquema inicial está en `202611130001_enable_rls.sql`. No editar migraciones ya aplicadas; crear una nueva para cambios posteriores.

## Verificación pendiente del equipo

- Verificar el flujo con una cuenta cliente, una zona activa, una categoría activa y una imagen en el proyecto Supabase del equipo.
- Revisar que las migraciones HU-F01 `202611130001_enable_rls.sql` y `202611130002_request_photos_bucket.sql` ya estén aplicadas; no ejecutarlas de nuevo si ya se aplicaron.
