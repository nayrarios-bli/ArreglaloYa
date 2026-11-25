# Supabase

Guardar aquí las migraciones SQL revisadas por el equipo. NestJS se conecta mediante `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `apps/api/.env`; no guardar credenciales reales en este directorio.

Mantener una migración nueva por cambio de esquema; no modificar una migración que ya se haya aplicado. El backend valida sesión, rol y propiedad de los registros antes de consultar o cambiar datos. Mantener direcciones exactas y documentos privados fuera de las respuestas públicas de la API.

## Fotos de solicitudes

La migración `202611130002_request_photos_bucket.sql` crea el bucket privado `request-photos`, con límite de 10 MB por archivo y formatos JPEG, PNG y WebP. Aplicarla en Supabase después de la migración inicial. No convertir el bucket en público.

La tabla `request_attachments` guarda el `storage_path` del objeto (por ejemplo, `<requestId>/<uuid>.webp`), no una URL pública. El endpoint `POST /requests/:requestId/attachments` de NestJS valida sesión, rol y propiedad de la solicitud, comprueba formato y tamaño, sube el objeto con `SUPABASE_SECRET_KEY` y devuelve una URL firmada válida por una hora. Nunca exponer esa clave ni permitir que el navegador invente rutas o URLs confiables.

El endpoint de carga está implementado, pero la pantalla aún no lo invoca. Falta integrar HU-F16 para obtener un token y encadenar la creación de solicitud con la carga de cada foto. Si falla la asociación del archivo en `request_attachments`, NestJS intenta retirar el objeto para evitar archivos huérfanos.
