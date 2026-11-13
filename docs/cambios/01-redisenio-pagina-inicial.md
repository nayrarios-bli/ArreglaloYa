# Cambio 01: rediseño de la página inicial

## Propósito

Presentar ArreglaloYa de forma clara a quienes visitan la plataforma por primera vez. La portada explica qué ofrece el sistema, qué servicios contempla y cómo comienza el proceso para encontrar ayuda en Cochabamba.

## Qué se cambió

- Se reorganizó la portada con navegación a las secciones de servicios, proceso y trabajadores.
- Se presentó el propósito de ArreglaloYa en el bloque principal.
- Se añadieron las cuatro categorías previstas: plomería, electricidad, albañilería y reparación de electrodomésticos.
- Se describieron los pasos generales para solicitar un servicio, revisar propuestas y coordinar.
- Se añadió una invitación informativa para trabajadores.
- Se adaptó el diseño a pantallas pequeñas y se respetó la preferencia del navegador por reducir movimiento.
- La portada muestra contenido público y no incluye datos personales ni conexión directa del navegador con la base de datos.

## Archivos principales

- `apps/web/src/app/app.html`: contenido y estructura de la página.
- `apps/web/src/app/app.css`: estilos de la portada y adaptación responsive.
- `apps/web/src/styles.css`: tipografía, foco de teclado y estilos globales.

## Relación con las historias de usuario

Este cambio es la base de **HU-F19: Consulta de información general de la plataforma**. Su contenido público y las categorías ya están presentes. Cuando se incorporen funciones protegidas, el aviso de inicio de sesión se integrará con **HU-F16**.

## Git y validación

- Rama de origen: `feature/update-pagina-inicial`.
- Commit del rediseño: `2cf3f83` (`feat(web): rediseña página principal`).
- La compilación de Angular se completó correctamente con `npm run build -w apps/web`.
- Para ejecutarla localmente desde la raíz del repositorio: `npm run dev:web`.

## Decisión de base de datos

El rediseño no requiere acceso a la base de datos. El proyecto usará PostgreSQL en Supabase y **no usará TypeORM**. La decisión y el plan de migraciones están registrados en `docs/decisiones.md`.
