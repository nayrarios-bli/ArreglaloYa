# HU-16: Registro e inicio de sesión

## Objetivo

Permitir que los visitantes se registren como clientes o trabajadores e inicien sesión en ArreglaloYa, para acceder a las funcionalidades correspondientes a su rol.

La autenticación se implementa mediante Supabase Auth, mientras que el backend NestJS administra las operaciones de registro, inicio de sesión y validación de usuarios.

## Estado

Implementada la funcionalidad de registro e inicio de sesión, incluyendo autenticación mediante Supabase, gestión de sesiones y protección de rutas según el rol del usuario.

## Endpoints

Los endpoints se encuentran disponibles bajo la ruta `/auth`.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/auth/check` | Comprueba la conexión con Supabase. |
| POST | `/auth/register` | Registra un nuevo cliente o trabajador. |
| POST | `/auth/login` | Verifica las credenciales e inicia sesión. |
| GET | `/auth/me` | Comprueba la validez del token del usuario autenticado. |

## Registro de usuarios

El formulario permite seleccionar el tipo de cuenta:

- Cliente (`client`).
- Trabajador (`worker`).

Los datos enviados para el registro son:

- Nombre completo (`fullName`).
- Correo electrónico (`email`).
- Contraseña (`password`).
- Número de celular (`phone`).
- Rol (`role`).

### Ejemplo de registro

```json
{
  "fullName": "Juan Pérez",
  "email": "juan@email.com",
  "password": "Password123",
  "phone": "70712345",
  "role": "client"
}
```

## Validaciones del registro

- El nombre completo debe ser un texto no vacío.
- El correo electrónico debe tener un formato válido.
- La contraseña debe contener al menos 8 caracteres.
- El número de celular es opcional en el DTO y debe ser un texto cuando se proporciona.
- El rol debe corresponder a `client` o `worker`.
- El formulario comprueba que la contraseña y su confirmación coincidan.
- Si el correo ya está registrado, el sistema informa que la cuenta existe.

## Inicio de sesión

El usuario inicia sesión proporcionando su correo electrónico y contraseña.

El backend utiliza Supabase Auth para verificar las credenciales mediante `signInWithPassword`.

Si la autenticación es correcta, consulta el perfil correspondiente en la base de datos y devuelve:

- Identificador del usuario.
- Correo electrónico.
- Nombre completo.
- Número de celular.
- Rol.
- Estado de revisión, cuando corresponde a un trabajador.
- Tokens de acceso y actualización.
- Fecha de expiración de la sesión.

Si las credenciales son incorrectas o la cuenta todavía requiere confirmación del correo, el sistema informa que no se pudo iniciar sesión.

## Gestión de perfiles después del registro

La creación de los perfiles se realiza automáticamente mediante un trigger de Supabase asociado al registro de usuarios.

Al registrarse un usuario:

1. Supabase Auth crea la cuenta en `auth.users`.
2. El trigger obtiene los datos enviados durante el registro.
3. Se crea el registro correspondiente en `profiles`.
4. Si el usuario es cliente, se crea su registro en `client_profiles`.
5. Si el usuario es trabajador, se crea su registro en `worker_profiles`.

El trigger solamente permite los roles `client` y `worker`, y comprueba que el nombre completo no esté vacío.

## Gestión de confirmación de correo

El registro contempla dos posibles respuestas:

- Si Supabase devuelve una sesión, el frontend guarda la sesión y continúa con la navegación correspondiente.
- Si se requiere confirmar el correo electrónico, se informa al usuario que debe revisar su correo antes de iniciar sesión.

Cuando la confirmación es necesaria, el usuario es dirigido a la pantalla de inicio de sesión, donde se muestra el mensaje correspondiente.

## Gestión de sesiones

El frontend utiliza `AuthService` para administrar la sesión del usuario.

Las operaciones principales son:

- `register()`: envía los datos de registro al backend.
- `login()`: envía las credenciales.
- `saveSession()`: almacena la sesión recibida.
- `getSession()`: obtiene la sesión actual.
- `getUser()`: obtiene los datos del usuario autenticado.
- `getAccessToken()`: obtiene el token de acceso.
- `isAuthenticated()`: comprueba si existe un token de acceso.
- `logout()`: elimina la sesión almacenada en el navegador.

La sesión se almacena en `sessionStorage`, utilizando la clave `arreglaloYaSession`.

## Seguridad y control de acceso

La implementación incorpora mecanismos para proteger los recursos de la aplicación.

### Backend

- `SupabaseAuthGuard`: verifica el token Bearer mediante Supabase y obtiene la identidad del usuario.
- `RolesGuard`: consulta el rol del usuario en la tabla `profiles` y comprueba que tenga los permisos requeridos.
- `WorkerStatusGuard`: permite controlar el acceso de los trabajadores según su estado de revisión.
- `Roles`: decorador utilizado para establecer los roles autorizados en los endpoints.

### Frontend

- `authGuard`: restringe el acceso a usuarios no autenticados y permite conservar la ruta solicitada mediante `returnUrl`.
- `roleGuard`: verifica que el usuario tenga el rol requerido.
- `workerStatusGuard`: controla el acceso de los trabajadores según su estado.

## Redirección según el rol y estado

Después del registro o inicio de sesión, el sistema determina la navegación según el tipo de usuario.

| Usuario | Condición | Ruta |
|---|---|---|
| Cliente | Sesión iniciada | `/` |
| Trabajador | Estado pendiente | `/trabajador/pendiente` |
| Trabajador | Estado aprobado | `/trabajador` |
| Trabajador | Estado rechazado | `/trabajador/rechazado` |

De esta manera, los trabajadores no acceden al panel principal mientras su perfil se encuentre pendiente de revisión.

## Base de datos

La funcionalidad utiliza Supabase Auth y las siguientes tablas:

- `auth.users`: almacena las cuentas administradas por Supabase Auth.
- `profiles`: almacena los datos generales del usuario y su rol.
- `client_profiles`: almacena la información específica del perfil del cliente.
- `worker_profiles`: almacena la información específica del perfil del trabajador y su estado de revisión.

También se utilizan políticas de seguridad a nivel de fila (RLS) para controlar el acceso a los datos.

## Migraciones relacionadas

- `supabase/migrations/202611140001_create_auth_profile_trigger.sql`: crea la función y el trigger encargado de generar automáticamente los perfiles después del registro.
- `supabase/migrations/202611140002_create_auth_rls_policies.sql`: habilita RLS, establece permisos y define políticas de acceso para las tablas de perfiles.

## Configuración

El backend utiliza variables de entorno para conectarse a Supabase:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PUBLISHABLE_KEY`

La configuración se carga mediante `ConfigModule` de NestJS. Las claves privadas se mantienen en el archivo `.env`, que no debe subirse al repositorio.

## Archivos principales

**Backend**

- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/dto/register.dto.ts`
- `apps/api/src/modules/auth/dto/login.dto.ts`
- `apps/api/src/modules/auth/guards/supabase-auth.guard.ts`
- `apps/api/src/modules/auth/guards/roles.guard.ts`
- `apps/api/src/modules/auth/guards/worker-status.guard.ts`
- `apps/api/src/database/supabase.service.ts`
- `apps/api/src/database/supabase.module.ts`
- `apps/api/src/app.module.ts`

**Frontend**

- `apps/web/src/app/features/auth/pages/register/register.ts`
- `apps/web/src/app/features/auth/pages/register/register.html`
- `apps/web/src/app/features/auth/pages/login/login.ts`
- `apps/web/src/app/features/auth/pages/login/login.html`
- `apps/web/src/app/core/auth.service.ts`
- `apps/web/src/app/core/auth.guard.ts`
- `apps/web/src/app/core/role.guard.ts`
- `apps/web/src/app/core/worker-status.guard.ts`
- `apps/web/src/app/app.routes.ts`

**Base de datos**

- `supabase/migrations/202611140001_create_auth_profile_trigger.sql`
- `supabase/migrations/202611140002_create_auth_rls_policies.sql`