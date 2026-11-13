# HU-F01: publicación de solicitudes

## Estado

La pantalla Angular y las operaciones iniciales de NestJS están preparadas. La API crea solicitudes en la zona activa del perfil del cliente y permite asociar imágenes al bucket privado `request-photos`. Falta integrar la sesión de cliente de HU-F16 con el formulario y completar el flujo de envío desde la pantalla. HU-F02 no forma parte de esta entrega.

## Endpoints de HU-F01

| Método y ruta | Acceso | Comportamiento |
|---|---|---|
| `GET /catalog/categories` | Público | Lista categorías activas para el formulario. |
| `POST /requests` | Sesión Supabase con rol `client` | Crea una solicitud en la zona activa del perfil del cliente. |
| `POST /requests/:requestId/attachments` | Sesión Supabase con rol `client` | Sube una imagen JPEG, PNG o WebP de hasta 10 MB, si la solicitud pertenece al cliente. Recibe multipart con campo `file`, guarda la ruta y devuelve un enlace firmado por una hora. |

Las imágenes se guardan en Supabase Storage y `request_attachments` registra el `storage_path`, no una URL pública permanente. La zona se obtiene del perfil del cliente y no se recibe del navegador.

### Ejemplo para crear una solicitud

```json
{
  "categoryId": "uuid-de-categoria",
  "title": "Fuga debajo del lavaplatos",
  "description": "La conexión pierde agua cuando se abre el grifo.",
  "availableFrom": "2026-11-14T13:00:00.000Z",
  "availableUntil": "2026-11-14T17:00:00.000Z"
}
```

Los horarios son opcionales. Si se envían ambos, el final debe ser posterior al inicio. Para adjuntar fotos, primero se crea la solicitud y luego se sube cada foto a `/requests/:requestId/attachments`.

## Reglas aplicadas

- NestJS valida el token Bearer con Supabase Auth y obtiene el rol desde `profiles`.
- Solo un cliente con perfil y zona activa puede crear solicitudes.
- La categoría debe estar activa.
- Solo el cliente dueño de la solicitud puede adjuntar archivos.
- La API acepta JPEG, PNG y WebP de hasta 10 MB y valida la firma básica del archivo además del MIME declarado.
- El bucket es privado; los enlaces temporales duran una hora.

## Configuración

Cada integrante copia `apps/api/.env.example` como `apps/api/.env` y configura `SUPABASE_URL` y `SUPABASE_SECRET_KEY`. La clave secreta solo se usa en NestJS. `main.ts` carga el archivo desde `apps/api/.env` tanto en desarrollo como en el build.

La migración `202611130002_request_photos_bucket.sql` crea el bucket privado `request-photos`. La migración de RLS del esquema inicial está en `202611130001_enable_rls.sql`. No editar migraciones ya aplicadas; crear una nueva para cambios posteriores.

## Pendiente para cerrar HU-F01

- Integrar la sesión de cliente de HU-F16 en Angular y pasar su token a `RequestsApiService`.
- Conectar el formulario: crear solicitud, subir las imágenes seleccionadas y mostrar éxito o error.
- Manejar el caso donde la solicitud se crea pero falla la subida de una o más imágenes.
- Verificar el flujo completo con una cuenta cliente y una imagen en el proyecto Supabase del equipo.
