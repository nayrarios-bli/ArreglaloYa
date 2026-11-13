# Inicio de HU-F01 y HU-F02: API de solicitudes

## Estado

Las operaciones iniciales están implementadas en NestJS. Para HU-F01 existe una pantalla Angular y la API ya crea solicitudes y adjunta imágenes al bucket privado. Falta integrar una sesión de cliente en Angular y encadenar desde el formulario la creación de la solicitud y la carga de sus fotos. Para HU-F02 la interfaz Angular sigue pendiente. Estas historias no se deben marcar como terminadas hasta completar sus flujos desde la aplicación con una sesión válida.

## Endpoints

| Método y ruta | Acceso | Comportamiento |
|---|---|---|
| `GET /catalog/categories` | Público | Lista categorías activas. |
| `GET /catalog/zones` | Público | Lista zonas activas. |
| `POST /requests` | Sesión Supabase con rol `client` | Crea una solicitud en la zona del perfil del cliente. |
| `POST /requests/:requestId/attachments` | Sesión Supabase con rol `client` | Sube una imagen JPEG, PNG o WebP (máximo 10 MB) si la solicitud pertenece al cliente. Guarda su ruta y devuelve un enlace firmado por una hora. Multipart: campo `file`. |
| `GET /requests/compatible` | Sesión Supabase con rol `worker` | Lista solicitudes abiertas que coinciden con categorías y zonas de un trabajador aprobado. |

Las respuestas de solicitudes compatibles no incluyen nombres, teléfonos ni direcciones de clientes. La zona de la nueva solicitud se obtiene del perfil del cliente; no se acepta desde el navegador.

### Ejemplo de publicación

```json
{
  "categoryId": "uuid-de-categoria",
  "title": "Fuga debajo del lavaplatos",
  "description": "La conexión pierde agua cuando se abre el grifo.",
  "availableFrom": "2026-11-14T13:00:00.000Z",
  "availableUntil": "2026-11-14T17:00:00.000Z"
}
```

Los horarios son opcionales. Si se envían ambos, el final debe ser posterior al inicio. Para adjuntar fotos se crea primero la solicitud y luego se llama al endpoint de attachments por cada archivo.

## Reglas aplicadas

- El token Bearer se valida con Supabase Auth y el rol se lee de `profiles`.
- Solo clientes pueden publicar.
- El cliente debe tener una zona activa en su perfil y la categoría debe estar activa.
- Solo trabajadores aprobados pueden consultar solicitudes.
- Las coincidencias se determinan mediante las categorías y zonas del trabajador.
- Las respuestas del catálogo solo incluyen identificadores y datos públicos de categorías y zonas activas.

## Configuración local

Cada integrante copia `apps/api/.env.example` como `apps/api/.env` y completa `SUPABASE_URL` y `SUPABASE_SECRET_KEY` desde el panel de Supabase. `main.ts` carga ese archivo desde la carpeta de `apps/api`, tanto en desarrollo como en el build. La clave secreta se queda en el backend: puede omitir RLS y nunca debe exponerse en el navegador. [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys)

La migración `202611130001_enable_rls.sql` activa RLS en las tablas del esquema inicial. No agrega políticas de acceso directo para `anon` o `authenticated`; la API usa la clave secreta, valida sesión y rol, y funciona como punto de acceso a los datos. Revisar la autorización en cada endpoint antes de desplegar.

## Pendiente para cerrar ambas HU

- Conectar el formulario HU-F01 con `POST /requests` y enviar el token de sesión.
- Usar el catálogo real de la API en el formulario; ahora muestra categorías de vista previa si el catálogo no está disponible.
- Implementar estados de publicación exitosa y de error recibidos desde la API.
- Crear la vista de solicitudes compatibles, con carga, lista vacía y errores para HU-F02.
- Integrar los tokens y roles definidos por HU-F16.
- Acordar con el grupo de perfiles cuándo queda aprobado un trabajador y qué zonas y especialidades puede registrar.
- El bucket privado `request-photos` queda configurado por la migración `202611130002_request_photos_bucket.sql`; hay que aplicarla en Supabase. La ruta de carga ya está implementada en NestJS; falta integrarla con la pantalla y una sesión de HU-F16.
- Revisar y aplicar la migración RLS en Supabase. No modificar la migración inicial si ya se aplicó.
