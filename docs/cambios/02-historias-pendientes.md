# Seguimiento de historias de usuario

Este listado resume las 25 historias funcionales del documento de requerimientos y el reparto acordado por el equipo. El integrante que está trabajando en esta rama indicó que pertenece al **Grupo 2**.

## Estado actual

- **HU-F19 — contenido público implementado:** la portada muestra información y categorías sin iniciar sesión y no consulta datos personales. El aviso para funciones protegidas se integrará junto con el flujo de sesión de HU-F16.
- **HU-F01 — formulario visible en Angular; publicación pendiente:** la API crea solicitudes y ya puede subir imágenes al bucket privado y devolver enlaces temporales. El formulario aún no completa el envío, porque falta integrar la sesión de HU-F16 y encadenar publicación y carga desde la pantalla.
- **HU-F02 — backend iniciado:** la API tiene la consulta de solicitudes compatibles. Falta la pantalla Angular y la integración con el inicio de sesión de HU-F16.
- **HU-F13 y HU-F24**, además de las historias de los grupos 1, 3, 4 y 5, siguen pendientes de implementación.
- **Resumen del Grupo 2:** HU-F01 tiene pantalla y API inicial, pero aún no publica; HU-F02 tiene el backend iniciado; HU-F19 está implementada en la portada; HU-F13 y HU-F24 siguen pendientes.
- Los requisitos de calidad transversales (compatibilidad, rendimiento, seguridad, trazabilidad y usabilidad) aplican a las historias; no son cinco HUs funcionales adicionales.

## Grupo 1 — Cuentas y perfiles

- [ ] **HU-F12:** Administración revisa y aprueba perfiles de trabajadores.
- [ ] **HU-F15:** Superadministración gestiona cuentas administrativas.
- [ ] **HU-F16:** Visitante se registra e inicia sesión con un rol.
- [ ] **HU-F17:** Cliente registra y actualiza sus datos personales y zona.
- [ ] **HU-F18:** Trabajador registra especialidades, zonas, horarios y documentación, y envía el perfil a revisión.

## Grupo 2 — Catálogo y solicitudes

- [ ] **HU-F01:** Cliente publica una solicitud con descripción, fotos opcionales y horarios. **Pantalla y backend iniciales; guardado, sesión y Storage pendientes**; ver `03-hu01-hu02-api.md`.
- [ ] **HU-F02:** Trabajador consulta solicitudes compatibles con especialidad y zona. **Backend iniciado**; ver `03-hu01-hu02-api.md`.
- [ ] **HU-F13:** Administración mantiene categorías y zonas de atención.
- [x] **HU-F19:** Visitante consulta información pública y servicios. Queda integrar el aviso al agregar funciones protegidas mediante HU-F16.
- [ ] **HU-F24:** Solicitud sin ofertas gana prioridad y vence según el plazo que confirme el equipo.

## Grupo 3 — Ofertas y acuerdos de precio

- [ ] **HU-F03:** Trabajador presenta una oferta estimada e indica si requiere visita previa.
- [ ] **HU-F04:** Cliente compara ofertas e información de los trabajadores.
- [ ] **HU-F05:** Cliente revisa y acepta el precio definitivo después de una visita, si corresponde.
- [ ] **HU-F06:** Cliente aprueba o rechaza aumentos por trabajos adicionales o repuestos.
- [ ] **HU-F20:** Cliente cancela una solicitud o servicio que aún no finalizó.

## Grupo 4 — Prestación y seguimiento del servicio

- [ ] **HU-F07:** Cliente y trabajador acuerdan un horario.
- [ ] **HU-F08:** Se registra el monto acordado y la confirmación declarada del pago.
- [ ] **HU-F21:** Cliente o trabajador consulta el estado de solicitudes y servicios.
- [ ] **HU-F22:** Trabajador actualiza el estado y registra la finalización.
- [ ] **HU-F23:** Cliente y trabajador se contactan mediante un enlace a WhatsApp.

## Grupo 5 — Confianza, soporte y protección

- [ ] **HU-F09:** Cliente califica al trabajador después de finalizar el servicio.
- [ ] **HU-F10:** Trabajador califica al cliente después de finalizar el servicio.
- [ ] **HU-F11:** Cliente o trabajador registra un reclamo para administración.
- [ ] **HU-F14:** Administración consulta reportes de actividad.
- [ ] **HU-F25:** Dirección exacta del cliente queda protegida antes de aceptar el servicio.

## Orden sugerido por dependencias

1. **HU-F16** antes de los flujos que requieren cuenta y rol.
2. **HU-F17** y **HU-F18** después de definir el acceso y los datos del perfil.
3. **HU-F01** y **HU-F02** antes de ofertas (**HU-F03** y **HU-F04**).
4. **HU-F04** antes de confirmar precio u horario (**HU-F05** y **HU-F07**).
5. **HU-F22** antes de calificaciones (**HU-F09** y **HU-F10**).
6. Antes de HU-F24, confirmar con el equipo la prioridad, el plazo de vencimiento y qué significa que la solicitud “gane prioridad”.

## Criterio para marcar una HU como terminada

Vincular su Issue y PR, cumplir los criterios de aceptación, cubrir estados vacíos y errores, proteger los datos privados en NestJS y añadir una migración SQL cuando cambie el esquema. HU-F01 y HU-F02 no se consideran terminadas hasta integrar las pantallas con una sesión válida definida por HU-F16.
