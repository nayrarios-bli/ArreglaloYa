# HU-12 – Revisión de trabajadores

## 1. Descripción

La HU-12 implementa el proceso de revisión administrativa de los perfiles de trabajadores antes de que puedan publicarse en la plataforma ArreglaloYa.

El administrador puede consultar los perfiles enviados a revisión, visualizar su información y registrar una decisión de aprobación o rechazo. La revisión permite comprobar que la información del perfil esté disponible y completa; no constituye una certificación profesional del trabajador.

Esta funcionalidad se relaciona con la HU-18, ya que el trabajador completa su perfil y lo envía para que la administración pueda revisarlo.

## 2. Cambios en la base de datos

Para registrar cuándo un trabajador envía su perfil a revisión, se incorporó la columna `submitted_at` en la tabla `public.worker_profiles`.

### 2.1. Migración creada

Archivo:

`supabase/migrations/202611200001_add_worker_submitted_at.sql`

Contenido:

```sql
ALTER TABLE public.worker_profiles
ADD COLUMN submitted_at timestamptz;
```

La columna permite almacenar la fecha y hora en que el trabajador envía su perfil a revisión.

Se utiliza para diferenciar los perfiles que ya fueron enviados de aquellos que todavía se encuentran en proceso de completar su información.

### 2.2. Uso de submitted_at

- Cuando el trabajador envía su perfil a revisión, se registra la fecha y hora del envío.
- La consulta administrativa considera los perfiles pendientes que ya fueron enviados.
- Cuando un perfil rechazado vuelve a enviarse, se registra una nueva fecha de envío.
- La fecha permite identificar el envío más reciente del perfil.

La columna admite valores nulos, por lo que los perfiles existentes no requieren tener una fecha de envío al momento de incorporar la migración.

## 3. Implementación del backend

La funcionalidad se desarrolló utilizando NestJS y se incorporó al módulo de administración.

### 3.1. Estructura implementada

Dentro de `apps/api/src/modules/admin/` se trabajó con los siguientes archivos:

- `admin.module.ts`: registra el módulo y sus dependencias.
- `admin.controller.ts`: define las rutas para consultar y revisar trabajadores.
- `admin.service.ts`: contiene la lógica de consulta, validación y actualización de los perfiles.
- `dto/review-worker.dto.ts`: valida los datos recibidos al registrar una decisión de revisión.

El módulo de administración se registró en `AppModule`.

### 3.2. Consulta de trabajadores pendientes

Se implementó el método `getPendingWorkers()` en `AdminService`.

La consulta obtiene los perfiles cuyo estado es `pending` y que ya cuentan con una fecha de envío registrada.

Para presentar la información necesaria al administrador, se complementan los datos de `worker_profiles` con información relacionada de las siguientes tablas:

- `profiles`: nombre completo y teléfono.
- `worker_categories`: especialidades asociadas al trabajador.
- `categories`: nombres de las especialidades.
- `worker_zones`: zonas de atención asociadas.
- `zones`: nombres y ciudades de las zonas.
- `worker_availability`: días y horarios disponibles.

De esta manera, la administración puede revisar la información del trabajador desde una sola consulta.

### 3.3. Revisión del perfil

Se implementó el método `reviewWorker()` para registrar la decisión administrativa.

Las decisiones permitidas son:

- `approved`: el perfil es aprobado.
- `rejected`: el perfil es rechazado.

Antes de actualizar el registro, el servicio verifica que el perfil exista y que todavía se encuentre pendiente de revisión.

Al guardar la decisión, se actualizan los siguientes campos de `worker_profiles`:

| Campo | Descripción |
|---|---|
| `review_status` | Estado resultante de la revisión. |
| `reviewed_by` | Identificador del administrador que realizó la revisión. |
| `reviewed_at` | Fecha y hora de la revisión. |
| `review_notes` | Observaciones registradas por el administrador. |

Las observaciones son opcionales. Si no se proporcionan, se almacena un valor nulo.

También se incorporaron validaciones para evitar que un perfil que ya fue revisado vuelva a recibir una decisión sobre el mismo estado pendiente.

### 3.4. Validación de la solicitud

El archivo `review-worker.dto.ts` valida los datos recibidos:

- La decisión debe ser `approved` o `rejected`.
- Las observaciones, si se proporcionan, deben ser texto.
- Las observaciones no pueden superar los 1000 caracteres.

## 4. Seguridad y permisos

Los endpoints administrativos están protegidos mediante:

- `SupabaseAuthGuard`: verifica la autenticación del usuario.
- `RolesGuard`: comprueba los permisos asociados al rol.
- `@Roles('admin', 'superadmin')`: limita el acceso a administradores y superadministradores.

De esta manera, los usuarios con rol de cliente o trabajador no pueden ejecutar las operaciones de revisión administrativa.

## 5. Endpoints implementados

### 5.1. Consultar trabajadores pendientes

**Método:** GET

**Ruta:**

```http
GET /admin/workers/pending
```

Permite obtener los perfiles enviados que todavía esperan una decisión administrativa.

La respuesta incluye los datos personales disponibles, descripción, especialidades, zonas de atención, disponibilidad y fecha de envío.

### 5.2. Registrar una decisión de revisión

**Método:** PATCH

**Ruta:**

```http
PATCH /admin/workers/:workerId/review
```

Permite aprobar o rechazar el perfil de un trabajador.

Ejemplo de solicitud:

```json
{
  "decision": "rejected",
  "notes": "Se deben completar algunos datos del perfil."
}
```

Para aprobar un perfil, el valor de `decision` debe ser `approved`. El campo `notes` es opcional.

## 6. Implementación del frontend

Se incorporó una sección administrativa para consultar y revisar los perfiles enviados por los trabajadores, utilizando Angular.

### 6.1. Archivos implementados

Dentro de `apps/web/src/app/features/admin/` se trabajó con la siguiente estructura:

- `models/admin.models.ts`: define las interfaces para los trabajadores, sus especialidades, zonas, disponibilidad y datos de revisión.
- `services/admin-api.service.ts`: contiene las peticiones HTTP para consultar trabajadores pendientes y registrar decisiones.
- `pages/workers/workers.ts`: controla la carga de trabajadores, apertura del formulario de revisión y envío de decisiones.
- `pages/workers/workers.html`: presenta la lista de trabajadores y el formulario de revisión.
- `pages/workers/workers.css`: define los estilos de la pantalla.

También se incorporó el panel principal de administración mediante los archivos de la sección `pages/dashboard/`.

### 6.2. Pantalla de revisión

La pantalla permite:

- Consultar la cantidad de perfiles pendientes.
- Visualizar los datos del trabajador.
- Consultar su descripción o experiencia.
- Identificar sus especialidades.
- Consultar sus zonas de atención.
- Revisar su disponibilidad horaria.
- Visualizar la fecha de envío.
- Actualizar la lista de solicitudes.

### 6.3. Formulario de revisión

Al seleccionar aprobar o rechazar, se abre un formulario que permite registrar observaciones de hasta 1000 caracteres.

Antes de enviar la decisión, el sistema muestra la acción que se va a realizar y el nombre del trabajador.

Durante el envío, los controles se deshabilitan para evitar solicitudes repetidas.

## 7. Flujo de estados

El proceso de revisión contempla los siguientes estados:

| Estado | Descripción |
|---|---|
| `pending` | El perfil fue enviado y espera una decisión administrativa. |
| `approved` | El administrador aprobó el perfil. |
| `rejected` | El administrador rechazó el perfil y registró, si corresponde, observaciones. |

Cuando un trabajador corrige su perfil rechazado y lo vuelve a enviar, el sistema restablece el estado a `pending`, registra una nueva fecha en `submitted_at` y limpia los datos de la revisión anterior.

## 8. Pruebas realizadas

Se realizaron pruebas del funcionamiento del backend mediante Postman y se verificaron los cambios correspondientes en Supabase.

Las pruebas contemplaron:

1. Consulta de los trabajadores pendientes mediante el endpoint GET.
2. Verificación de la información recuperada desde las tablas relacionadas.
3. Rechazo de un perfil con observaciones.
4. Comprobación del estado `rejected` y de los datos de revisión almacenados.
5. Reenvío del perfil por parte del trabajador.
6. Comprobación de que el perfil vuelve al estado `pending`.
7. Verificación de la actualización de `submitted_at` y limpieza de los datos de revisión anteriores.
8. Nueva consulta de pendientes para comprobar que el perfil reenviado vuelve a estar disponible para revisión.

También se verificó que el backend compile sin errores y que las rutas administrativas estén registradas.

**Estado de la verificación del frontend:** la pantalla y sus componentes fueron implementados. La comprobación visual completa de la actualización de la lista queda pendiente de una revisión posterior.

## 9. Consideraciones finales

La implementación de HU-12 incorpora el proceso de revisión administrativa de trabajadores, la protección de las operaciones mediante roles, el registro de las decisiones y las observaciones, y el seguimiento de los envíos mediante `submitted_at`.

La funcionalidad se integra con el proceso de registro y envío de perfiles de HU-18, permitiendo que los trabajadores cuyos perfiles fueron rechazados puedan corregirlos y enviarlos nuevamente para una revisión administrativa.