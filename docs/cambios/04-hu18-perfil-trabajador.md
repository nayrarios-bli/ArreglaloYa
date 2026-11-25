# HU-18: Perfil del trabajador

## Objetivo

Permitir que los trabajadores completen y actualicen la información de su perfil, registrando su descripción, categorías de servicio, zonas de atención y disponibilidad horaria. Una vez completada la información obligatoria, podrán enviar su perfil para revisión.

## Estado

Implementada la funcionalidad de edición y envío del perfil del trabajador para revisión.

## Endpoints

Los endpoints se encuentran protegidos mediante autenticación y están disponibles únicamente para usuarios con el rol `worker`.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/workers/me` | Obtiene el perfil del trabajador autenticado. |
| PUT | `/workers/me` | Actualiza la información del perfil. |
| POST | `/workers/me/submit` | Envía el perfil para revisión. |

## Información del perfil

El trabajador puede registrar y actualizar:

- Descripción o experiencia (`bio`).
- Categorías de servicios que ofrece.
- Zonas en las que brinda atención.
- Días y horarios de disponibilidad.

## Ejemplo de actualización

```json
{
  "bio": "Tengo experiencia en mantenimiento y reparación de instalaciones.",
  "categoryIds": [
    "UUID_DE_CATEGORIA"
  ],
  "zoneIds": [
    "UUID_DE_ZONA"
  ],
  "availability": [
    {
      "weekday": 1,
      "startsAt": "08:00",
      "endsAt": "17:00"
    }
  ]
}
```

## Reglas aplicadas

- La información se obtiene y actualiza utilizando el identificador del trabajador autenticado.
- Las categorías y zonas registradas deben existir y encontrarse activas.
- Los horarios deben tener un formato válido y la hora de finalización debe ser posterior a la hora de inicio.
- Para enviar el perfil a revisión, se requiere una descripción, al menos una categoría, una zona de atención y un horario de disponibilidad.
- Un trabajador que ya se encuentra aprobado no puede volver a enviar su perfil mediante este proceso.
- Al enviar el perfil, su estado cambia a `pending`.
- Durante el envío se limpian los datos anteriores de revisión (`reviewed_by`, `reviewed_at` y `review_notes`).

## Base de datos

La funcionalidad utiliza las tablas existentes de Supabase:

- `worker_profiles`: almacena la descripción y el estado de revisión del trabajador.
- `worker_categories`: relaciona al trabajador con las categorías de servicio.
- `worker_zones`: relaciona al trabajador con sus zonas de atención.
- `worker_availability`: almacena sus días y horarios disponibles.
- `categories` y `service_zones`: proporcionan los datos de las categorías y zonas disponibles.

No fue necesario crear una migración adicional para esta funcionalidad, ya que se utilizaron las tablas existentes.

## Flujo de funcionamiento

1. El trabajador inicia sesión y accede a la opción de completar su perfil.
2. El sistema carga la información registrada del trabajador.
3. El trabajador completa o modifica su descripción, categorías, zonas y horarios.
4. Puede guardar los cambios realizados.
5. Cuando cumple los requisitos obligatorios, puede enviar su perfil para revisión.
6. El sistema cambia el estado del perfil a `pending`.

## Verificación realizada

- Se compiló correctamente el frontend Angular.
- Se compiló correctamente el backend NestJS.
- Se verificó el registro del módulo `WorkersModule` y sus tres endpoints.
- Se comprobó en Supabase la actualización de la descripción del trabajador y el cambio del estado a `pending`.

## Pendiente de integración o verificación

- No se implementó la carga de documentación porque todavía no se definieron los tipos de documentos requeridos ni su estructura de almacenamiento.
- La interfaz y el proceso administrativo para aprobar o rechazar trabajadores no forman parte de esta implementación.
- Se debe verificar que los listados públicos de trabajadores muestren únicamente perfiles con estado `approved`.
- La actualización de categorías, zonas y horarios se realiza mediante operaciones separadas de eliminación e inserción; estas operaciones no están agrupadas en una transacción.

## Archivos principales

**Backend**
- `apps/api/src/modules/workers/dto/update-worker-profile.dto.ts`
- `apps/api/src/modules/workers/workers.service.ts`
- `apps/api/src/modules/workers/workers.controller.ts`
- `apps/api/src/modules/workers/workers.module.ts`
- `apps/api/src/app.module.ts`

**Frontend**
- `apps/web/src/app/features/worker/pages/profile/`
- `apps/web/src/app/features/worker/pages/worker-api.service.ts`
- `apps/web/src/app/features/worker/pages/pending/`
- `apps/web/src/app/features/worker/pages/rejected/`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/auth.service.ts`