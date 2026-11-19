# HU-17: Gestión del perfil del cliente

## Objetivo

Permitir que los clientes consulten y actualicen su información personal y su zona de servicio desde la aplicación ArreglaloYa.

## Estado

Implementada la funcionalidad de consulta y actualización del perfil del cliente.

## Endpoints

Los endpoints se encuentran protegidos mediante autenticación y control de roles. Únicamente los usuarios con el rol `client` pueden acceder a ellos.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/client/profile` | Consulta el perfil del cliente autenticado. |
| GET | `/client/zones` | Obtiene las zonas de servicio activas. |
| PATCH | `/client/profile` | Actualiza los datos del perfil del cliente. |

## Información del perfil

El cliente puede consultar y modificar los siguientes datos:

- Nombre completo (`fullName`).
- Número de celular (`phone`).
- Zona de servicio (`homeZoneId`).

El perfil también devuelve el identificador del usuario y su rol.

## Ejemplo de actualización

```json
{
  "fullName": "Juan Pérez",
  "phone": "70712345",
  "homeZoneId": "UUID_DE_ZONA"
}
```

## Reglas aplicadas

- El sistema obtiene el identificador del usuario desde la sesión autenticada.
- Solo se permite consultar o modificar perfiles correspondientes al rol `client`.
- No se permite actualizar el perfil si no se proporciona al menos un dato.
- El nombre debe ser un texto de entre 3 y 100 caracteres.
- El número de celular debe contener entre 7 y 15 dígitos.
- La zona seleccionada debe existir y encontrarse activa.
- El nombre y el celular no pueden contener únicamente espacios.
- Después de actualizar los datos, el sistema devuelve el perfil actualizado.
- La consulta de zonas devuelve únicamente aquellas cuyo campo `is_active` está establecido en `true`.

## Base de datos

La funcionalidad utiliza las tablas existentes de Supabase:

- `profiles`: almacena los datos personales del usuario, como nombre completo, celular y rol.
- `client_profiles`: almacena la relación del cliente con su zona de servicio mediante `home_zone_id`.
- `service_zones`: proporciona las zonas disponibles, incluyendo su identificador, nombre y ciudad.

No fue necesario crear una migración adicional para esta funcionalidad.

## Funcionamiento del frontend

La interfaz se encuentra en la ruta `/cliente/perfil` y está protegida mediante `authGuard` y `roleGuard`, con acceso exclusivo para usuarios con rol `client`.

El funcionamiento sigue estos pasos:

1. El cliente accede a la sección de su perfil.
2. El sistema consulta sus datos personales y su zona asignada.
3. También carga las zonas de servicio disponibles.
4. El cliente activa el modo de edición.
5. Puede modificar su nombre, celular y zona de servicio.
6. Puede guardar los cambios o cancelar la edición.
7. Al guardar, se envían los datos al backend mediante una solicitud `PATCH`.
8. Si la actualización es correcta, se muestran los datos actualizados y un mensaje de confirmación.

## Seguridad y validaciones

- El backend utiliza `SupabaseAuthGuard` y `RolesGuard`.
- El decorador `@Roles('client')` restringe el acceso al rol correspondiente.
- El identificador del usuario se obtiene de `req.user.id`, evitando que el cliente indique otro identificador para modificar su perfil.
- Las solicitudes del frontend incluyen el token de acceso en la cabecera `Authorization`.
- Las validaciones se realizan tanto en el formulario como en el DTO del backend.

## Verificación

La implementación cuenta con:

- Control de acceso por autenticación y rol.
- Validaciones de los datos recibidos.
- Comprobación de existencia y estado activo de la zona seleccionada.
- Manejo de errores al consultar y actualizar el perfil.
- Confirmación visual cuando los cambios se guardan correctamente.

## Archivos principales

**Backend**

- `apps/api/src/modules/profiles/client-profile.controller.ts`
- `apps/api/src/modules/profiles/client-profile.service.ts`
- `apps/api/src/modules/profiles/dto/update-client-profile.dto.ts`
- `apps/api/src/modules/profiles/profiles.module.ts`

**Frontend**

- `apps/web/src/app/features/profiles/client-profile.service.ts`
- `apps/web/src/app/features/profiles/pages/client-profile/client-profile.ts`
- `apps/web/src/app/features/profiles/pages/client-profile/client-profile.html`
- `apps/web/src/app/features/profiles/pages/client-profile/client-profile.css`
- `apps/web/src/app/app.routes.ts`
