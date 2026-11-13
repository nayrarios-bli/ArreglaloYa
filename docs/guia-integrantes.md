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

La migración inicial está en `supabase/migrations/202611040001_initial_schema.sql`; como no habilita RLS, se agregó `supabase/migrations/202611130001_enable_rls.sql`. Esta segunda migración aún debe revisarse y aplicarse en Supabase. El backend usa una clave secreta que omite RLS, así que cada endpoint debe comprobar la sesión, el rol y la propiedad del registro. Si en el futuro Angular accede a tablas directamente, habrá que diseñar políticas RLS para ese acceso.

Si la migración inicial ya se ejecutó, apliquen solo `202611130001_enable_rls.sql` desde Supabase SQL Editor después de revisarla; no vuelvan a ejecutar el esquema inicial. RLS sin políticas bloquea el acceso directo de `anon` y `authenticated`. Los endpoints de NestJS usan la clave secreta del servidor y deben validar sesión, rol y propiedad del registro. No desactiven RLS para resolver errores.

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

La API NestJS usa `@supabase/supabase-js`; cada integrante debe completar `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en su `apps/api/.env` local. La clave secreta nunca se comparte en GitHub y no se usa desde Angular. El proyecto guarda cambios de esquema como migraciones SQL versionadas en `supabase/migrations/`; no se usa TypeORM. HU-F01 y HU-F02 ya tienen endpoints iniciales en NestJS, mientras su integración con Angular y las sesiones de HU-F16 sigue pendiente.
