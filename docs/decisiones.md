# Decisiones y pendientes

- Frontend: Angular con TypeScript, HTML y CSS.
- Backend: NestJS con TypeScript.
- Base de datos: PostgreSQL alojado en Supabase, confirmado por el equipo.
- ORM: no se utilizará TypeORM. Los cambios del esquema se mantendrán como migraciones SQL versionadas en `supabase/migrations/` y se aplicarán en Supabase.
- La API será el punto de acceso a los datos de la aplicación. El navegador no recibirá `DATABASE_URL` ni credenciales privadas.
- NestJS accederá a Supabase mediante `@supabase/supabase-js`; el cliente se configura en `apps/api/.env`. Su clave secreta queda solo en el servidor y requiere autorización por rol en la API.
- No se usa TypeORM ni se duplican migraciones. Mantener el esquema como SQL versionado en `supabase/migrations/`.
- Pendiente: definir campos obligatorios, permisos detallados por rol, estados y transiciones de solicitudes, vigencia de ofertas y condiciones de cotización, cancelación y reclamos según el documento de requerimientos.
