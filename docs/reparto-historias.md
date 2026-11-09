# Reparto de historias para trabajo grupal

La sección 5.3 del documento tiene **25 historias funcionales**. Se reparten en cinco grupos de cinco historias, agrupadas por flujo para reducir dependencias entre ramas. Los números corresponden al orden en que aparecen en el documento.

## Grupo 1 — Cuentas y perfiles

Rama sugerida: `feat/grupo-1-cuentas-perfiles`

| HU | Historia resumida |
|---|---|
| HU-12 | Administración revisa y aprueba perfiles de trabajadores. |
| HU-15 | Superadministración gestiona cuentas administrativas. |
| HU-16 | Visitante se registra e inicia sesión con un rol. |
| HU-17 | Cliente registra y actualiza datos personales y zona. |
| HU-18 | Trabajador registra especialidades, zonas, horarios y documentación; envía perfil a revisión. |

**Entrega del grupo:** flujos de acceso y perfiles, conectados con el catálogo y roles definidos con el equipo. La documentación del trabajador y el acceso administrativo requieren autorización por rol.

## Grupo 2 — Catálogo y solicitudes

Rama sugerida: `feat/grupo-2-catalogo-solicitudes`

| HU | Historia resumida |
|---|---|
| HU-01 | Cliente publica solicitud con descripción, fotos opcionales y horarios. |
| HU-02 | Trabajador consulta solicitudes compatibles con especialidad y zona. |
| HU-13 | Administración mantiene categorías y zonas de atención. |
| HU-19 | Visitante consulta información pública y servicios. |
| HU-24 | Solicitud sin ofertas gana prioridad y vence tras 30 días. |

**Entrega del grupo:** catálogo inicial, publicación y consulta de solicitudes. Confirmar con el equipo qué significa “aumentar prioridad” antes de definir su fórmula.

## Grupo 3 — Ofertas y acuerdos de precio

Rama sugerida: `feat/grupo-3-ofertas-precios`

| HU | Historia resumida |
|---|---|
| HU-03 | Trabajador presenta oferta estimada e indica si requiere visita previa. |
| HU-04 | Cliente compara ofertas e información de los trabajadores. |
| HU-05 | Cliente revisa y acepta precio definitivo tras visita, si aplica. |
| HU-06 | Cliente aprueba o rechaza aumentos por trabajos adicionales o repuestos. |
| HU-20 | Cliente cancela una solicitud o servicio no finalizado. |

**Entrega del grupo:** ciclo de propuestas y decisión del cliente. HU-20 se asigna aquí porque la cancelación afecta la oferta y aceptación; coordinar estados con el grupo 4.

## Grupo 4 — Prestación y seguimiento del servicio

Rama sugerida: `feat/grupo-4-servicios-seguimiento`

| HU | Historia resumida |
|---|---|
| HU-07 | Cliente y trabajador acuerdan horario. |
| HU-08 | Se registra monto acordado y confirmación declarada del pago. |
| HU-21 | Cliente o trabajador consulta estado de solicitudes y servicios. |
| HU-22 | Trabajador actualiza estado y registra la finalización. |
| HU-23 | Cliente y trabajador se contactan mediante enlace a WhatsApp. |

**Entrega del grupo:** servicio después de seleccionar una oferta. El pago es un registro informativo; no procesa ni verifica transferencias. Acordar estados y horarios con el grupo 3 antes de implementarlos.

## Grupo 5 — Confianza, soporte y protección

Rama sugerida: `feat/grupo-5-confianza-soporte`

| HU | Historia resumida |
|---|---|
| HU-09 | Cliente califica al trabajador al finalizar el servicio. |
| HU-10 | Trabajador califica al cliente al finalizar el servicio. |
| HU-11 | Cliente o trabajador registra reclamo para administración. |
| HU-14 | Administración consulta reportes de actividad. |
| HU-25 | Dirección exacta del cliente queda protegida antes de aceptar el servicio. |

**Entrega del grupo:** calificaciones, reclamos, reportes y restricciones de visibilidad. La dirección exacta es dato privado; definir e implementar permisos antes de exponerla en endpoints o pantallas.

## Requisitos de calidad transversales

El documento también incluye cinco historias derivadas de requisitos no funcionales (compatibilidad móvil/escritorio, rendimiento, seguridad, trazabilidad y usabilidad). **No están contadas dentro de las 25 funcionales**. Son criterios que los cinco grupos deben considerar en sus entregas, no un sexto paquete aislado.

## Forma de trabajo en GitHub

1. Abrir una Issue por historia y copiar su criterio de aceptación desde el documento de requerimientos.
2. Asignar una persona responsable y enlazar la Issue a uno de los cinco grupos.
3. Crear una rama por historia desde `main`, por ejemplo `feat/hu-01-publicar-solicitud`. Las ramas de grupo sirven como referencia; evitar que varias personas desarrollen directamente sobre la misma rama.
4. Abrir un Pull Request hacia `main`, enlazar la Issue y pedir revisión a otro integrante.
5. Integrar solo después de revisar interfaz, API, validaciones, permisos y migraciones SQL cuando correspondan.

### Acuerdos para evitar conflictos

- El primer Pull Request define y documenta contratos API y cambios de base de datos; avisar al resto antes de cambiar tablas o endpoints compartidos.
- No editar en paralelo `app.routes.ts`, `app.config.ts`, `main.ts`, `app.module.ts` ni la misma migración. Nombrar una persona integradora para esos archivos y agregar nuevas migraciones en archivos separados.
- Al cambiar la base de datos, incluir una migración numerada y actualizar la descripción de la Issue. No modificar una migración que ya haya sido aplicada por otros; crear otra que corrija o amplíe el esquema.
- Unir historias dependientes en orden: HU-16 antes de flujos con sesión; HU-01/HU-02 antes de HU-03/HU-04; HU-04 antes de HU-05/HU-07; HU-22 antes de HU-09/HU-10.
- Dividir las tareas frontend y backend dentro de la misma Issue si trabajan dos personas: una entrega la UI y otra la API/BD; acordar primero DTOs y respuestas.

## Criterio general de cierre de una historia

- Cumple los criterios de aceptación acordados en la Issue.
- Maneja errores y estados vacíos de forma comprensible.
- Verifica el rol y la propiedad de los datos privados en el backend.
- Incluye o actualiza migración cuando cambia el esquema.
- El Pull Request explica el cambio y no contiene secretos, archivos de entorno ni dependencias generadas.
