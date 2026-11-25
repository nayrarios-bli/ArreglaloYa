# HU-15: Gestión de cuentas de administradores

## Objetivo

Permitir que el superadministrador gestione las cuentas de los administradores de ArreglaloYa, mediante operaciones de creación, consulta, modificación, activación y desactivación.

La funcionalidad utiliza Supabase Auth para administrar las credenciales de acceso y NestJS para controlar las operaciones y validar los permisos correspondientes.

## Estado

Implementada y probada la funcionalidad de gestión de cuentas de administradores.

El módulo permite crear administradores, consultar sus datos, modificar su información, cambiar opcionalmente sus contraseñas y activar o desactivar sus cuentas.

El acceso a estas operaciones está restringido al rol `superadmin`.

## Funcionalidades implementadas

- Crear cuentas de administradores.
- Listar los administradores registrados.
- Consultar los datos de un administrador específico.
- Modificar nombre completo, correo electrónico y teléfono.
- Cambiar la contraseña de forma opcional durante la edición.
- Activar cuentas desactivadas.
- Desactivar cuentas activas.
- Consultar el estado de cada cuenta.
- Buscar administradores por nombre o correo electrónico.

## Endpoints

Los endpoints se encuentran disponibles bajo la ruta `/superadmin/admins`.

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/superadmin/admins` | Crea una nueva cuenta de administrador. |
| GET | `/superadmin/admins` | Obtiene el listado de administradores. |
| GET | `/superadmin/admins/:id` | Consulta los datos de un administrador específico. |
| PATCH | `/superadmin/admins/:id` | Modifica los datos de un administrador. |
| PATCH | `/superadmin/admins/:id/deactivate` | Desactiva una cuenta de administrador. |
| PATCH | `/superadmin/admins/:id/activate` | Reactiva una cuenta de administrador. |

Todos los endpoints requieren autenticación y autorización mediante el rol `superadmin`.

## Creación de administradores

El superadministrador puede registrar una nueva cuenta proporcionando los siguientes datos:

- Nombre completo (`fullName`).
- Correo electrónico (`email`).
- Contraseña (`password`).
- Número de teléfono (`phone`), opcional.

### Proceso de creación

1. El frontend envía los datos al endpoint de creación.
2. El backend crea el usuario mediante Supabase Auth.
3. Se establece el rol de administrador en los metadatos de autenticación.
4. Se ejecuta la función `provision_admin` para crear el perfil correspondiente con el rol `admin`.
5. El backend verifica que la cuenta haya quedado registrada correctamente.

Las cuentas creadas mediante este procedimiento se registran con el rol `admin`, sin permitir que el usuario público se asigne ese rol mediante el registro normal.

## Consulta de administradores

El sistema permite obtener el listado de administradores registrados y consultar individualmente sus datos.

La información presentada incluye:

- Identificador de la cuenta.
- Nombre completo.
- Correo electrónico.
- Número de teléfono.
- Rol.
- Fecha de registro.
- Estado de la cuenta.

El estado se determina mediante la información de bloqueo de la cuenta en Supabase Auth.

## Modificación de administradores

El superadministrador puede modificar los siguientes datos:

- Nombre completo.
- Correo electrónico.
- Número de teléfono.
- Contraseña.

La contraseña es opcional durante la edición. Si el campo permanece vacío, se conserva la contraseña actual. Si se proporciona una nueva, debe cumplir con las validaciones establecidas.

La actualización sincroniza los datos correspondientes entre Supabase Auth y la tabla `profiles`.

## Activación y desactivación de cuentas

El sistema permite controlar el acceso de los administradores mediante dos operaciones:

- **Desactivar:** aplica un bloqueo a la cuenta mediante Supabase Auth.
- **Activar:** elimina el bloqueo y permite nuevamente el acceso.

El frontend muestra el estado de cada cuenta y actualiza los indicadores de administradores activos e inactivos.

Además, el backend impide que el superadministrador desactive su propia cuenta mediante esta operación.

La validación del estado de bloqueo también se contempla durante el inicio de sesión y la protección de las rutas del backend.

## Seguridad y control de acceso

La funcionalidad incorpora controles tanto en el backend como en el frontend.

### Backend

- `SupabaseAuthGuard`: verifica la autenticación del usuario mediante el token de acceso.
- `RolesGuard`: comprueba los permisos del usuario según su rol.
- `@Roles('superadmin')`: restringe los endpoints de gestión exclusivamente al superadministrador.
- Las operaciones administrativas utilizan las funciones de Supabase Auth desde el backend.
- La función `provision_admin` valida que la cuenta tenga los metadatos de autorización correspondientes.
- La función de bootstrap del superadministrador tiene ejecución restringida a `service_role`.

### Frontend

- `authGuard`: impide el acceso a usuarios no autenticados.
- `roleGuard`: comprueba que el usuario tenga el rol requerido.
- La ruta `/superadmin` está protegida para el rol `superadmin`.
- El servicio `SuperadminApiService` envía el token de acceso en las solicitudes al backend.
- El componente de gestión comprueba el rol y la existencia del token antes de ejecutar las operaciones.

## Base de datos y Supabase

La funcionalidad utiliza principalmente los siguientes recursos:

- `auth.users`: almacena las cuentas de autenticación.
- `profiles`: almacena los datos generales y el rol de cada usuario.
- `app_role`: enum que contempla los roles `client`, `worker`, `admin` y `superadmin`.

La creación de administradores utiliza un procedimiento específico para evitar que el registro público pueda asignar directamente el rol `admin`.

### Migraciones relacionadas

- `supabase/migrations/202611220001_allow_admin_provisioning.sql`: habilita el procedimiento controlado de creación de cuentas administrativas y establece las restricciones correspondientes.
- `supabase/migrations/202611220002_bootstrap_superadmin.sql`: incorpora el procedimiento inicial de creación del superadministrador.
- `supabase/migrations/202611220003_secure_superadmin_bootstrap.sql`: refuerza la seguridad del procedimiento de bootstrap.
- `supabase/migrations/202611220004_provision_admin.sql`: incorpora la función encargada de provisionar el perfil de un administrador.

Las migraciones fueron aplicadas mediante el editor SQL de Supabase.

## Inicialización del superadministrador

Se incorporó el script:

`apps/api/scripts/create-superadmin.mjs`

Este script permite realizar la inicialización de la cuenta del superadministrador mediante Supabase Auth y el procedimiento de bootstrap.

La inicialización contempla la creación de la cuenta, la asignación de los metadatos correspondientes y la verificación del rol en el perfil.

## Pruebas realizadas

Se realizaron pruebas de los endpoints mediante Postman y de la interfaz desde el navegador.

| Prueba | Resultado |
|---|---|
| Crear administrador | Correcto (201). |
| Listar administradores | Correcto (200). |
| Consultar administrador por ID | Correcto (200). |
| Modificar datos del administrador | Correcto (200). |
| Desactivar administrador | Correcto. |
| Activar administrador | Correcto. |
| Acceso de un administrador normal a endpoints de superadmin | Denegado (403). |
| Acceso del superadministrador a los endpoints de gestión | Permitido (200). |
| Inicio de sesión del superadministrador | Correcto. |
| Acceso al módulo de gestión desde el frontend | Correcto. |

También se verificó la actualización de los datos del administrador y la sincronización de la información entre el perfil y los metadatos de autenticación.

## Archivos principales

**Backend**

- `apps/api/src/modules/superadmin/superadmin.controller.ts`
- `apps/api/src/modules/superadmin/superadmin.service.ts`
- `apps/api/src/modules/superadmin/superadmin.module.ts`
- `apps/api/src/modules/superadmin/dto/`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/guards/supabase-auth.guard.ts`
- `apps/api/src/app.module.ts`
- `apps/api/scripts/create-superadmin.mjs`

**Frontend**

- `apps/web/src/app/features/superadmin/superadmin-api.service.ts`
- `apps/web/src/app/features/superadmin/pages/admin-management/admin-management.ts`
- `apps/web/src/app/features/superadmin/pages/admin-management/admin-management.html`
- `apps/web/src/app/features/superadmin/pages/admin-management/admin-management.css`
- `apps/web/src/app/features/auth/pages/login/login.ts`
- `apps/web/src/app/core/auth.service.ts`
- `apps/web/src/app/app.routes.ts`

**Base de datos**

- `supabase/migrations/202611220001_allow_admin_provisioning.sql`
- `supabase/migrations/202611220002_bootstrap_superadmin.sql`
- `supabase/migrations/202611220003_secure_superadmin_bootstrap.sql`
- `supabase/migrations/202611220004_provision_admin.sql`

## Resultado

La HU-15 permite al superadministrador administrar las cuentas de los administradores desde una interfaz centralizada, manteniendo la separación de permisos entre administradores y superadministradores.