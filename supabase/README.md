# Supabase

Guardar aquí las migraciones SQL revisadas por el equipo. NestJS se conecta con `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` configuradas en `apps/api/.env`; no guardar credenciales reales en este directorio.

Mantener la dirección exacta y los documentos privados fuera de las respuestas públicas de la API.

## HU-F08: confirmación declarada del pago

La tabla `payment_confirmations` de la migración inicial almacena una declaración por participante y servicio. NestJS expone `GET /services/payment-confirmations` y `POST /services/:serviceId/payment-confirmations`; requiere que el usuario sea cliente o trabajador asignado, que el servicio tenga `final_amount`, y que la cuenta de trabajador esté aprobada. Los métodos permitidos por el documento son efectivo (`cash`) y QR (`qr`).

El API conserva las dos declaraciones y reporta si falta una, si coinciden o si discrepan; no procesa ni verifica la recepción del dinero. La pantalla temporal de integración está en `/prueba/hu-08`. No requiere una migración nueva, pero para probarla debe existir un servicio asociado al usuario con precio acordado.
