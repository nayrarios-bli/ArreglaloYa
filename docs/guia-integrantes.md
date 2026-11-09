# Guía para integrantes del equipo

Esta guía describe cómo obtener el proyecto, ejecutar lo que ya está disponible y colaborar sin compartir secretos. La portada está implementada; las pantallas de las historias de usuario y la conexión de NestJS con PostgreSQL aún deben desarrollarse.

## 1. Antes de empezar

- Acceso al repositorio de GitHub (cuando se publique).
- Node.js y npm instalados. Comprueba con `node -v` y `npm -v`; usa una versión compatible con las dependencias fijadas en `package-lock.json`.
- Acceso a la organización/proyecto de Supabase solo para quienes trabajen con datos o configuración de la BD. No hace falta acceso para modificar únicamente la portada.
- Git instalado (`git --version`).

## 2. Obtener e instalar el proyecto

Después de que el repositorio esté en GitHub, cada integrante clona el proyecto y entra a su carpeta:

```powershell
git clone <URL_DEL_REPOSITORIO>
cd ArreglaloYa
npm install
```

Ejecuta `npm install` en la raíz, donde está el `package.json` con los workspaces. El `package-lock.json` fija las versiones compartidas; no lo borres ni uses instalaciones separadas en `apps/web` y `apps/api` salvo que el equipo acuerde actualizar dependencias.

## 3. Ejecutar la portada Angular

Desde la raíz del proyecto:

```powershell
npm run dev:web
```

Abre la dirección local que indique Angular, normalmente `http://localhost:4200`. La portada no necesita Supabase ni NestJS para mostrarse. Detén el servidor con `Ctrl+C`.

## 4. Ejecutar el backend NestJS

En una segunda terminal, desde la raíz:

```powershell
npm run dev:api
```

NestJS inicia en el puerto `3000`. Por ahora es solo el esqueleto de NestJS: el endpoint raíz responde `Hello World!`; todavía no hay módulos funcionales ni conexión PostgreSQL. Crear `apps/api/.env` por sí solo no activa una conexión, porque falta implementar el proveedor de base de datos y cargar esas variables en NestJS.

## 5. Supabase y seguridad

- El proyecto compartido de Supabase contiene PostgreSQL. La base remota es común al equipo; no se crea una base distinta por integrante.
- Invitar integrantes desde la organización de Supabase usando sus cuentas individuales. Asignar el rol mínimo que necesiten. Nunca compartir la contraseña de la cuenta propietaria.
- `apps/api/.env.example` es una plantilla. No copiar credenciales reales a archivos versionados ni enviarlas en Issues, pull requests o chats públicos.
- El `.gitignore` excluye `.env`. Si se conecta la API más adelante, cada persona autorizada configura sus propios valores locales.
- La clave `service_role` o una clave secreta de Supabase no se debe poner en Angular ni en GitHub. La API NestJS será el lado servidor que acceda a la base.

### Migración inicial y Row Level Security

La migración local está en `supabase/migrations/202611040001_initial_schema.sql`. Define el primer esquema, pero el archivo **no contiene instrucciones `ENABLE ROW LEVEL SECURITY` ni políticas**. La advertencia que aparece en Supabase debe tomarse en serio: antes de dejar datos reales, activen RLS en todas las tablas de `public` y diseñen las políticas de acceso.

Si el SQL ya se ejecutó, revisen en **Table Editor** que RLS esté activado para cada tabla creada. Si alguna tabla no lo tiene, actívenlo desde la tabla o ejecuten este bloque en SQL Editor:

```sql
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
```

RLS activado sin políticas bloquea el acceso a través de la Data API a los roles `anon` y `authenticated`. Eso es una protección inicial, pero la aplicación no podrá consultar tablas hasta que se acuerden y añadan políticas. No desactiven RLS para “arreglar” errores; revisen permisos y políticas. La cuenta propietaria puede seguir viendo tablas en SQL Editor.

La base compartida debe cambiarse mediante migraciones versionadas en `supabase/migrations/`. Antes de modificar el esquema, coordinen en una Issue y no editen una migración que otra persona ya aplicó; creen una migración nueva para cambios posteriores. No apliquen la migración inicial más de una vez si ya existen las tablas.

## 6. Trabajar en historias y ramas

El reparto de historias, las dependencias y los acuerdos de integración están en `docs/reparto-historias.md`. Para cada historia:

1. Tomen una Issue con responsable y criterios de aceptación.
2. Creen una rama desde `main`, por ejemplo `feat/hu-01-publicar-solicitud`.
3. Hagan cambios acotados y commits con mensajes claros.
4. Abran Pull Request hacia `main`, enlacen la Issue y pidan revisión.
5. No incluyan `.env`, contraseñas, claves o archivos de `node_modules`/`dist`.

El repositorio ejecuta automáticamente `npm ci` y `npm run build` al abrir un Pull Request hacia `main`. Esperen el check **Build / build** y resuelvan los errores antes de pedir integración. Las pruebas automatizadas no son un requisito obligatorio todavía.

Si dos grupos necesitan el mismo endpoint o tabla, acuerden primero el contrato y avisen al resto. Las historias relacionadas con datos privados deben incluir controles de acceso en el backend, no solo ocultar datos en la interfaz.

## Qué falta para conectar la aplicación

El equipo debe definir el modelo de autorización y las políticas RLS; implementar en NestJS la configuración de `DATABASE_URL`, el acceso PostgreSQL, migraciones y módulos; y acordar qué datos y endpoints necesita cada historia. Hasta entonces, ejecuten la portada con `npm run dev:web` y traten la conexión Supabase como trabajo pendiente.
