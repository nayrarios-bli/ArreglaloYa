# Supabase

Guardar aquí las migraciones SQL revisadas por el equipo. NestJS se conecta mediante `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `apps/api/.env`; no guardar credenciales reales en este directorio.

Mantener una migración nueva por cambio de esquema; no modificar una migración que ya se haya aplicado. El backend valida sesión, rol y propiedad de los registros antes de consultar o cambiar datos. Mantener direcciones exactas y documentos privados fuera de las respuestas públicas de la API.

## Fotos de solicitudes

La migración `202611130002_request_photos_bucket.sql` crea el bucket privado `request-photos`, con límite de 10 MB por archivo y formatos JPEG, PNG y WebP. Aplicarla en Supabase después de la migración inicial. No convertir el bucket en público.

La tabla `request_attachments` guarda el `storage_path` del objeto (por ejemplo, `<requestId>/<uuid>.webp`), no una URL pública. El endpoint `POST /requests/:requestId/attachments` de NestJS valida sesión, rol y propiedad de la solicitud, comprueba formato y tamaño, sube el objeto con `SUPABASE_SECRET_KEY` y devuelve una URL firmada válida por una hora. Nunca exponer esa clave ni permitir que el navegador invente rutas o URLs confiables.

El endpoint de carga está implementado, pero la pantalla aún no lo invoca. Falta integrar HU-F16 para obtener un token y encadenar la creación de solicitud con la carga de cada foto. Si falla la asociación del archivo en `request_attachments`, NestJS intenta retirar el objeto para evitar archivos huérfanos.

## Documentos de trabajadores

La migración `202611250002_worker_documents.sql` crea la tabla `worker_documents` y el bucket privado `worker-documents`. El trabajador carga su CI (obligatorio para enviar el perfil a revisión) y, si cuenta con uno, su certificado de antecedentes. Se aceptan PDF, JPG, PNG y WebP de hasta 10 MB. El archivo se valida y se envía desde NestJS usando `SUPABASE_SECRET_KEY`; el navegador nunca accede directamente al bucket.

El panel de revisión usa URLs firmadas de diez minutos para que personal autorizado consulte los documentos. No se almacenan URLs públicas ni se conceden permisos directos a `anon` o `authenticated`. El endpoint de aprobación vuelve a comprobar la existencia del CI. No aplicar esta migración sobre un entorno hasta que el flujo backend/frontend de esta rama esté integrado.

## HU-07: horario del servicio

La migración `202611240002_prevent_service_schedule_overlap.sql` agrega una restricción para impedir horarios superpuestos de un mismo trabajador en servicios programados o en curso. Revísala y aplícala una sola vez desde el SQL Editor. Si ya existen cruces de horario, la migración se detiene y muestra un error; corrige esos datos antes de volver a aplicarla. No modifica ni elimina horarios.

NestJS expone `GET /services/scheduling` y `PATCH /services/:serviceId/schedule`. Solo cliente y trabajador asignados pueden consultar o registrar el horario; trabajadores deben estar aprobados. La pantalla de `Mis servicios` enlaza a la coordinación mientras el servicio está programado. Las partes coordinan por WhatsApp y una de ellas registra el horario acordado; la otra lo ve en el mismo servicio.

## HU-08: confirmación declarada del pago

La tabla `payment_confirmations` de la migración inicial almacena una declaración por participante y servicio. NestJS expone `GET /services/payment-confirmations` y `POST /services/:serviceId/payment-confirmations`. Solo se listan servicios finalizados con precio definido. Los métodos permitidos son efectivo (`cash`) y QR (`qr`). La ruta del frontend es `/servicios/pagos` y se accede desde el detalle de un servicio finalizado.

La aplicación compara las declaraciones de cliente y trabajador, pero no procesa ni verifica la recepción del dinero. No requiere una migración nueva.
