# ArreglaloYa

Base de trabajo colaborativo para una plataforma web de reparaciones en Cochabamba. El alcance se basa en el documento de ingeniería de requerimientos compartido por el equipo. Algunas reglas de negocio y campos aún requieren validación; esta estructura no los presenta como decisiones cerradas.

## Estructura

```text
apps/
  web/                   Angular, interfaz para clientes, trabajadores y administración
    src/app/
      core/              configuración global, autenticación y acceso a la API
      shared/            componentes y utilidades reutilizables
      features/          pantallas agrupadas por función
  api/                   NestJS, reglas de negocio y acceso a datos
    src/
      common/            filtros, guards y utilidades transversales
      database/          conexión a PostgreSQL y repositorios compartidos
      modules/           módulos por función
supabase/
  migrations/            cambios SQL versionados
docs/                    decisiones y acuerdos del equipo
```

Cada función del backend se desarrolla dentro de su propio módulo NestJS. Cuando una función lo requiera, separar controladores/DTO, casos de uso, reglas de dominio y repositorios dentro de ese módulo. Las reglas de negocio no deben depender de Angular ni de SQL. Crear abstracciones solo cuando haya una necesidad real; reutilizar código compartido cuando evite duplicación comprobada.

## Primeros pasos

1. Instalar Node.js y npm compatibles con las versiones indicadas en los `package.json` generados por Angular y NestJS.
2. Ejecutar `npm install` en la raíz.
3. Copiar `apps/api/.env.example` a `apps/api/.env` y sustituir `DATABASE_URL` por la conexión de Supabase.
4. Ejecutar `npm run dev:api` y `npm run dev:web` en dos terminales. La API usa el puerto 3000 y Angular el 4200.

La cadena de conexión y cualquier clave privada pertenecen solo al backend y nunca deben incluirse en el código Angular ni en Git. El archivo `.env` queda ignorado. La conexión a la base de datos y el esquema se implementarán junto con los primeros casos de uso; no se ha creado una base de datos ni se han aplicado migraciones.

## Trabajo en Git

- Crear ramas cortas por función, por ejemplo `feat/solicitudes` o `fix/ofertas`.
- Abrir un pull request por cambio y revisar código, permisos de acceso y migraciones antes de integrar.
- Mantener `package-lock.json` versionado después de `npm install` y evitar subir `node_modules`, `dist` o secretos.
- Los cambios de esquema van en `supabase/migrations/` con nombres ordenados por fecha y una descripción breve.

La división de las 25 historias funcionales en cinco grupos, las ramas sugeridas y el flujo de Issues/PRs está en [docs/reparto-historias.md](docs/reparto-historias.md).

## Funciones previstas

Registro y perfiles; revisión de trabajadores; categorías y zonas; solicitudes; ofertas y cotizaciones; coordinación y estados del servicio; calificaciones; reclamos; administración. El enlace a WhatsApp y el registro informativo de pagos se implementarán dentro del flujo del servicio cuando sus reglas estén acordadas. No se planea chat interno, pagos integrados ni seguimiento GPS en la primera versión.
