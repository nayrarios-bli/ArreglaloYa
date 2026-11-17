# Supabase

Guardar aquí las migraciones SQL revisadas por el equipo. NestJS se conecta con `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` configuradas en `apps/api/.env`; no guardar credenciales reales en este directorio.

Mantener la dirección exacta y los documentos privados fuera de las respuestas públicas de la API.

## HU-F07: coordinación de horarios

Aplicar `202611170001_prevent_service_schedule_overlap.sql` después de `202611040001_initial_schema.sql`. La migración agrega una restricción para impedir que un trabajador tenga dos servicios programados o en curso con horarios superpuestos. Si detecta superposiciones existentes, se detiene y pide corregirlas; no modifica ni borra horarios.

NestJS expone `GET /services/scheduling` para listar los servicios programados del cliente o trabajador autenticado, y `PATCH /services/:serviceId/schedule` para guardar `startsAt` y `endsAt` como fechas ISO con zona horaria. Solo los participantes del servicio pueden cambiarlo; la cuenta de trabajador debe estar aprobada. La pantalla temporal de integración está en `/prueba/hu-07`. Si no existen servicios asociados al usuario, esa pantalla confirma la conexión con API y Supabase, pero no habrá un servicio que se pueda actualizar todavía.
