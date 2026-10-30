# DHub — Panel de coordinación técnica

Aplicación web privada para un coordinador técnico que gestiona varios proyectos y
equipos TIC (sistemas de información del Ministerio). Permite saber en todo momento
qué está haciendo cada persona, qué proyectos están activos, qué tareas están
bloqueadas o retrasadas y qué entregas o riesgos requieren atención.

## Stack técnico

- **Frontend**: React 19 + TypeScript + Vite, [HeroUI v3](https://heroui.com) (React Aria)
  + Tailwind CSS v4, React Router, dnd-kit (tableros Kanban), Recharts (analíticas),
  date-fns (calendario), Axios.
- **Backend**: .NET 10 Web API (ASP.NET Core), arquitectura en 3 capas
  (`DHub.Domain` / `DHub.Infrastructure` / `DHub.Api`), Entity Framework Core,
  documentación OpenAPI con Swagger UI (`/swagger`).
- **Base de datos**: PostgreSQL 16.
- **Despliegue**: Docker + Docker Compose (un `Dockerfile` por servicio).

## Estructura del repositorio

```
DHub/
├── backend/
│   ├── DHub.slnx
│   ├── Dockerfile
│   └── src/
│       ├── DHub.Domain/          # Entidades y enumerados (sin dependencias)
│       ├── DHub.Infrastructure/  # EF Core: DbContext, configuraciones, migraciones, seed
│       └── DHub.Api/             # Controllers REST, DTOs, mapeos, Program.cs (Swagger, CORS)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf                # Proxy /api y /swagger hacia el backend en producción
│   └── src/
│       ├── pages/                # Dashboard, Personas, Equipos, Proyectos, Tableros, Riesgos...
│       ├── components/           # Formularios, Kanban, layout, chips de estado
│       ├── lib/                  # Cliente API (axios) y utilidades de formato/colores
│       ├── context/               # Autenticación simple (localStorage)
│       └── types/                # Tipos TypeScript que reflejan los DTOs del backend
├── docker-compose.yml
└── .env.example
```

## Modelo de datos (resumen)

`Persona`, `Equipo`, `Proyecto`, `Tarea`, `Hito`, `Riesgo` (riesgos y bloqueos), `Evento`
(reuniones/entregas de calendario), `Vacacion` (periodo de vacaciones de una persona) y
`Nota` (registro de actividad y comentarios, asociable a proyecto, tarea o persona).
El detalle completo de columnas y relaciones
está en las entidades de `backend/src/DHub.Domain/Entities` y en las configuraciones de
EF Core (`backend/src/DHub.Infrastructure/Data/Configurations`).

Reglas de negocio aplicadas en el backend:

- Una **persona puede pertenecer a varios equipos a la vez** (relación muchos a
  muchos `Persona` ↔ `Equipo`, tabla `EquipoPersona`).
- Una tarea en estado **Bloqueada** exige motivo, responsable y fecha de revisión
  (validado en `TareasController` y reflejado en el formulario del frontend).
- Una tarea está **vencida** si su fecha objetivo es anterior a hoy y no está en
  estado `Hecha` o `Cancelada` (propiedad calculada `EsVencida`).
- La **carga** de una persona es la suma de estimaciones de sus tareas activas
  (`Planificada`, `EnCurso`, `EnRevision`, `Bloqueada`).
- El dashboard destaca tareas vencidas, bloqueadas, sin responsable y riesgos
  altos/críticos abiertos.
- Cada proyecto puede asociarse a un sistema de información, a un equipo y llevar
  un enlace manual a su tablero de **Jira** (clave y URL del proyecto); cada tarea
  admite un enlace manual opcional a su **ticket de Jira** (clave y URL) y puede
  llevar **comentarios** (notas de tipo `Comentario` asociadas a la tarea).

## Pantallas principales

1. **Dashboard**: indicadores globales, proyectos, próximos hitos, tareas vencidas,
   bloqueadas, sin responsable y riesgos altos. Filtrable por equipo.
2. **Personas**: listado con filtros (equipo, estado, texto), avatar con iniciales y
   color determinista por persona, alta/edición/baja (**una persona puede
   pertenecer a varios equipos**), exportación CSV, y **ficha de persona** con
   tareas activas, pendientes, bloqueadas, carga vs. disponibilidad, próximas
   entregas y notas de seguimiento.
3. **Equipos**: listado y **ficha de equipo** para **añadir o quitar personas** del
   equipo (una persona puede estar en varios equipos a la vez) y ver sus proyectos
   asociados.
4. **Proyectos**: listado con filtros y **ficha de proyecto** con pestañas de
   Resumen, Tareas, Hitos, Riesgos y Notas, con enlace al tablero de Jira.
5. **Tablero por equipo**: Kanban clásico (Backlog, Planificada, En curso, En
   revisión/QA, Bloqueada, Hecha, Cancelada) con arrastrar y soltar para cambiar el
   estado de una tarea; solo incluye tareas de proyectos del equipo seleccionado.
   Cada tarea admite **comentarios** y un enlace a su ticket de Jira. Al mover una
   tarjeta a **Bloqueada** o a **Hecha** se pide el motivo del bloqueo o la fecha
   de cierre antes de guardar.
6. **Tablero por usuario**: Kanban donde **cada columna es una persona del equipo
   seleccionado**; arrastrar una tarjeta a otra columna reasigna la tarea a esa
   persona.
6b. **Tablero por proyecto**: el mismo Kanban por estados, pero eligiendo un
    proyecto en lugar de un equipo.
7. **Calendario**: vista mensual con las tareas (por fecha objetivo) y los
   **eventos** del equipo (reuniones, entregas, hitos) en su día y hora; agenda del
   día seleccionado y alta/edición/baja de eventos.
8. **Analíticas**: gráficos de tareas por persona, tendencia de tareas completadas
   (por semana, mes o año), tareas por estado y por prioridad, riesgos por impacto,
   carga vs. disponibilidad por persona y tareas por proyecto.
9. **Riesgos y bloqueos**: listado global con impacto, probabilidad, responsable,
   estado y fecha de revisión; alta/edición y exportación CSV.
10. **Configuración**: tema claro/oscuro/sistema y **Mi cuenta** (nombre, usuario,
    email y cambio de contraseña del coordinador que usa la aplicación).
11. **Vacaciones**: vista mensual tipo "quién está fuera" con una fila por persona
    (filtrable por equipo) y una columna por día del mes; pulsar un día abre el
    alta o la edición del periodo de vacaciones de esa persona.

## Autenticación

Login simple de un único usuario coordinador. La cuenta (`CuentasUsuario`) se guarda
en la base de datos y se crea **una sola vez**, la primera vez que arranca la
aplicación sobre una base de datos vacía, a partir de las variables de entorno
`Auth__Usuario` / `Auth__Password` / `Auth__Nombre`. A partir de ahí esas variables
dejan de tener efecto: el nombre, el usuario, el email y la contraseña se gestionan
desde la propia aplicación (**Configuración → Mi cuenta**) y persisten en la base de
datos aunque reinicies o reconstruyas los contenedores. Las contraseñas se
almacenan con hash (`PasswordHasher` de ASP.NET Core), nunca en texto plano.
Preparado para sustituirse por **Microsoft Entra ID** (OIDC) en una fase posterior
sin cambiar el modelo de datos.

## Integración con Jira

El MVP funciona con datos propios. Cada proyecto admite un **enlace manual** a su
tablero de Jira (clave y URL) y cada tarea a su ticket de Jira (clave y URL). La
integración automática mediante la REST API de Jira queda prevista para una fase
posterior.

---

## Puesta en marcha con Docker Compose (recomendado)

Requisitos: Docker y Docker Compose.

```bash
cp .env.example .env   # opcional, valores por defecto ya funcionan
docker compose up --build
```

Servicios:

- Frontend: http://localhost:3000
- API + Swagger: http://localhost:5280/swagger
- PostgreSQL: localhost:5432 (usuario/clave/bd: `dhub` por defecto)

Al arrancar, el backend aplica automáticamente las migraciones de EF Core y, **solo
si la base de datos está completamente vacía**, inserta **datos de ejemplo
realistas** (3 equipos, 10 personas —algunas en varios equipos a la vez—, 3
proyectos, tareas con tickets de Jira y comentarios, hitos, riesgos, notas y
eventos de calendario). Esto ocurre una única vez: en los siguientes arranques,
aunque reinicies o reconstruyas los contenedores, tus datos reales nunca se
repiten, se sobrescriben ni se vuelven a sembrar, porque el seed comprueba que la
tabla de personas esté vacía antes de insertar nada. Si quieres desactivarlo del
todo (incluso para una base de datos nueva), pon `SEED_ENABLED=false` en tu `.env`.

**Credenciales de acceso por defecto**: usuario `coordinador`, contraseña
`coordinador123` (configurables solo para el primer arranque, ver `.env.example`).
Después puedes cambiar usuario, nombre, email y contraseña desde
**Configuración → Mi cuenta** dentro de la aplicación.

Para detener y conservar los datos:

```bash
docker compose down
```

Para detener y borrar también la base de datos:

```bash
docker compose down -v
```

## Puesta en marcha en local sin Docker (desarrollo)

### Backend

Requisitos: .NET SDK 10, PostgreSQL accesible (puedes levantar solo la base con
`docker compose up db`).

```bash
cd backend
dotnet run --project src/DHub.Api
```

La cadena de conexión por defecto (`appsettings.json`) apunta a
`Host=localhost;Port=5432;Database=dhub;Username=dhub;Password=dhub`; puedes
sobreescribirla con la variable de entorno `ConnectionStrings__DefaultConnection`.
La API queda disponible en `http://localhost:5280` y Swagger en
`http://localhost:5280/swagger`.

### Frontend

Requisitos: Node.js ≥ 22.12 (o ≥ 20.19).

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173` y apunta por defecto a la
API en `http://localhost:5280` (puedes cambiarlo con `VITE_API_URL` en un fichero
`.env.local`).

## API REST

Todos los endpoints están documentados interactivamente en Swagger UI
(`/swagger`). Recursos principales: `/api/personas` (cada persona con su lista de
equipos), `/api/equipos` (incluye `POST/DELETE /api/equipos/{id}/miembros/{personaId}`
para añadir/quitar miembros —una persona puede estar en varios equipos— y
`GET /api/equipos/{id}/tablero-usuarios` para el tablero por persona), `/api/proyectos`
(con `/hitos`), `/api/tareas` (con `PATCH /{id}/estado` para el Kanban y comentarios vía
`/api/notas?tareaId=`), `/api/riesgos`, `/api/notas`, `/api/eventos` (calendario, con
filtro `desde`/`hasta`), `/api/vacaciones` (filtros `personaId`/`equipoId`/`desde`/`hasta`),
`/api/dashboard` y `/api/auth` (`POST /login`, `GET /me`,
`PUT /perfil`, `PUT /password`). Los listados principales exponen un endpoint
`/export` adicional que devuelve CSV.

## Próximos pasos previstos

- Integración real con la REST API de Jira para sincronizar tickets y tableros en
  lugar de enlaces manuales.
- Autenticación con Microsoft Entra ID.
- Vista semanal/diaria adicional en el calendario (hoy solo vista mensual).
