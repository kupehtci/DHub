# Panorama — Panel de coordinación técnica

**Versión actual: 1.4.1** · [Changelog](#changelog)

Aplicación web privada para un coordinador técnico que gestiona varios proyectos y
equipos TIC (sistemas de información del Ministerio). Permite saber en todo momento
qué está haciendo cada persona, qué proyectos están activos, qué tareas están
bloqueadas o retrasadas y qué entregas o riesgos requieren atención.

> Antes conocida como **DHub**. La base de datos (usuario, BD y volumen de Docker) y las
> claves de `localStorage` conservan el nombre interno `dhub` para no perder datos ni sesiones.

## Stack técnico

- **Frontend**: React 19 + TypeScript + Vite, [HeroUI v3](https://heroui.com) (React Aria)
  + Tailwind CSS v4, React Router, dnd-kit (tableros Kanban), Recharts (analíticas),
  date-fns (calendario), Axios, react-markdown + remark-gfm (notas de eventos).
- **Backend**: .NET 10 Web API (ASP.NET Core), arquitectura en 3 capas
  (`Panorama.Domain` / `Panorama.Infrastructure` / `Panorama.Api`), Entity Framework Core,
  documentación OpenAPI con Swagger UI (`/swagger`), ClosedXML (exportación a Excel).
- **Base de datos**: PostgreSQL 16.
- **Despliegue**: Docker + Docker Compose (un `Dockerfile` por servicio).

## Estructura del repositorio

```
DHub/
├── backend/
│   ├── Panorama.slnx
│   ├── Dockerfile
│   └── src/
│       ├── Panorama.Domain/          # Entidades y enumerados (sin dependencias)
│       ├── Panorama.Infrastructure/  # EF Core: DbContext, configuraciones, migraciones, seed
│       └── Panorama.Api/             # Controllers REST, DTOs, mapeos, Program.cs (Swagger, CORS)
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

`Persona`, `Equipo`, `Proyecto`, `Tarea` (con relaciones entre tareas, `TareaRelacion`),
`Hito` (siempre de un proyecto), `Riesgo` (riesgos y bloqueos), `Evento` (reuniones,
entregas y otros eventos de calendario), `Vacacion` (periodo de vacaciones de una
persona), `Festivo` (festivo nacional, autonómico o local que afecta a un conjunto de
personas), `TareaDependencia` (A debe terminar antes de que empiece B), `TareaCambio`
(historial de cambios de cada tarea) y `Nota` (registro de actividad y comentarios, asociable a proyecto, tarea o
persona).
El detalle completo de columnas y relaciones
está en las entidades de `backend/src/Panorama.Domain/Entities` y en las configuraciones de
EF Core (`backend/src/Panorama.Infrastructure/Data/Configurations`).

Reglas de negocio aplicadas en el backend:

- Tareas, riesgos e hitos guardan su **fecha de creación y de última modificación**, y
  cada cambio de una tarea (estado, responsable, fechas, prioridad, estimación…) queda en
  su **historial** con fecha y autor. Ambas cosas las rellena `AppDbContext` al guardar.
- Las **dependencias** entre tareas no pueden ser circulares (se valida al guardarlas).
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

El menú lateral agrupa las vistas relacionadas en desplegables (**Proyectos**,
**Tareas** y **Tableros Kanban**).

1. **Dashboard**: bloque **Hoy** con la agenda del día (eventos e hitos), las tareas
   que empiezan o vencen hoy y quién está ausente (vacaciones o festivo); indicadores
   globales **clicables** que abren el detalle (proyectos activos, en riesgo, tareas
   vencidas, bloqueadas, sin responsable y riesgos altos); listas con scroll de
   proyectos, próximos hitos, tareas vencidas, riesgos, bloqueadas y sin responsable.
   Las tareas y eventos se abren directamente desde el dashboard. Filtrable por equipo.
2. **Personas**: listado con filtros (equipo, estado, texto), avatar con iniciales y
   color determinista por persona, alta/edición/baja (**una persona puede
   pertenecer a varios equipos**), exportación CSV, y **ficha de persona** con
   tareas activas, pendientes, bloqueadas, carga vs. disponibilidad, próximas
   entregas y notas de seguimiento.
3. **Equipos**: listado y **ficha de equipo** para **añadir o quitar personas** del
   equipo (una persona puede estar en varios equipos a la vez) y ver sus proyectos
   asociados.
4. **Proyectos**
   - **Lista de proyectos**: listado con filtros y **ficha de proyecto** con pestañas
     de Resumen, Tareas, Hitos, Riesgos, Notas y Jira.
   - **Gantt de proyectos**: barras de inicio a fin por proyecto, coloreadas por
     estado y con leyenda, agrupables por equipo o responsable; arrastrar una barra
     cambia sus fechas.
5. **Tareas**
   - **Lista de tareas**: todas las tareas con filtros, enlace y estado en vivo de
     Jira, tareas relacionadas y exportación CSV.
   - **Gantt de tareas**: línea temporal por persona, equipo o proyecto, con leyenda
     de colores (estado, prioridad, vencidas, fechas estimadas y relaciones);
     permite mover y redimensionar tareas y crear tareas en un hueco.
   - **Hitos**: todos los hitos de todos los proyectos, con filtros (texto, proyecto,
     equipo, estado, fechas), plazo relativo y alta/edición/completado rápido.
6. **Tableros Kanban**
   - **Por equipo**: Kanban clásico (Backlog, Planificada, En curso, En
     revisión/QA, Bloqueada, Hecha, Cancelada) con arrastrar y soltar para cambiar el
     estado de una tarea; solo incluye tareas de proyectos del equipo seleccionado.
     Al mover una tarjeta a **Bloqueada** o a **Hecha** se pide el motivo del bloqueo
     o la fecha de cierre antes de guardar.
   - **Por usuario**: cada columna es una persona del equipo seleccionado; arrastrar
     una tarjeta a otra columna reasigna la tarea.
   - **Por proyecto**: el mismo Kanban por estados, eligiendo un proyecto.
7. **Calendario**: vista mensual con eventos (reuniones, entregas, otros), **hitos de
   proyecto** y tareas por fecha objetivo; agenda del día seleccionado. Al crear se
   elige el tipo con pestañas: la pestaña **Hito** crea un hito de proyecto. Las notas
   de los eventos admiten **Markdown** (títulos, negritas, código, listas…).
8. **Analíticas**: filtros por equipo, proyecto, persona y periodo; KPIs (tareas
   cerradas, lead time, % a tiempo, hitos cumplidos, vencidas, bloqueadas, horas
   abiertas, riesgos altos) y gráficas de flujo de entrega, composición del trabajo,
   carga vs. capacidad (descontando vacaciones y festivos), salud de proyectos,
   hitos, matriz de riesgos y eventos por tipo.
9. **Riesgos y bloqueos**: listado global con impacto, probabilidad, responsable,
   estado y fecha de revisión; alta/edición y exportación CSV.
10. **Capacidad**: matriz persona × semana con el % de ocupación: la estimación de cada
    tarea abierta repartida entre las semanas que dura (32 h en 2 semanas = 16 h por
    semana) frente a la disponibilidad, descontando vacaciones y festivos. Aparte, las
    tareas vencidas sin cerrar y las que no tienen fechas, y desglose de cada semana.
11. **Vacaciones**: vista mensual tipo "quién está fuera" con una fila por persona
    (filtrable por equipo) y una columna por día. Permite registrar **vacaciones** o
    **festivos** (nacionales, autonómicos o locales) indicando a qué personas
    afectan; los festivos se muestran en verde. Exportación a **Excel** del año con
    resumen por persona (días naturales y laborables), detalle de vacaciones y
    festivos.
12. **Configuración**: tema claro/oscuro/sistema, **Mi cuenta** (nombre, usuario,
    email y cambio de contraseña) e **Integración con Jira**.

Todos los selectores de fecha usan el calendario de HeroUI en español, y los
selectores de proyecto, equipo y persona permiten escribir para filtrar.

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

Conexión real con **Jira Cloud** (REST API v3), configurable desde la propia
aplicación en **Configuración → Integración con Jira** (URL, email del usuario de
servicio y API token; incluye botón "Probar conexión"). Los datos se guardan en la
base de datos, no en variables de entorno, y el token nunca se devuelve en claro al
frontend (se muestra enmascarado). Cada proyecto puede enlazarse a un **espacio Jira
del catálogo propio** (`/api/jira/espacios`, sembrado una vez con los espacios de la
organización) en vez de escribir la clave a mano, y cada tarea con un ticket de Jira
permite **"Comprobar en Jira"** para traer en vivo su resumen, estado y asignado
reales (`GET /api/jira/ticket/{clave}`).

Además, el estado real de cada ticket enlazado se muestra como una pequeña etiqueta
"en vivo" en la tabla de Tareas, en los tableros Kanban y en la ficha de proyecto,
sin tener que pulsar nada: el backend mantiene una caché por ticket con un TTL de 5
minutos (`POST /api/jira/tickets/lote`) para no saturar la API de Jira. Cada ficha de
proyecto con un espacio Jira asociado tiene además una pestaña **Jira** que trae de
golpe, en directo, todos los tickets abiertos (o todos) de ese espacio mediante una
búsqueda JQL (`GET /api/jira/proyectos/{clave}/tickets`).

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
dotnet run --project src/Panorama.Api
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
`/api/festivos` (mismos filtros), `/api/hitos` (listado global con filtros
`q`/`proyectoId`/`equipoId`/`estado`/`desde`/`hasta`), `/api/analiticas/hitos`,
`/api/capacidad` (matriz semanal) y
`/api/capacidad/ausencias`, `/api/tareas/{id}/historial`, `/api/tareas/{id}/dependencias`,
`/api/analiticas/tiempos-estado`, `/api/dashboard` (acepta `hoy` con la fecha local del cliente) y `/api/auth`
(`POST /login`, `GET /me`, `PUT /perfil`, `PUT /password`). Los listados principales
exponen un endpoint `/export` adicional que devuelve CSV; `/api/vacaciones/export`
devuelve un Excel (`.xlsx`).

## Próximos pasos previstos

- Autenticación con Microsoft Entra ID.
- Vista semanal/diaria adicional en el calendario (hoy solo vista mensual).

## Changelog

El número de versión se indica al principio de cada mensaje de commit y en
`frontend/package.json` y `backend/Directory.Build.props`.

### 1.4.2 — en desarrollo

_Pendiente de publicar: la versión actual sigue siendo la 1.4.1._

**Datos nuevos**
- **Historial de cada tarea**: qué cambió (estado, responsable, proyecto, fechas,
  prioridad, tipo, estimación, título o motivo de bloqueo), de qué valor a cuál, cuándo y
  quién. Pestaña «Historial» en la ficha de la tarea.
- **Fecha de creación y de última modificación** en tareas, riesgos e hitos.
- Migración `HistorialImputacionesDependencias`. En los datos ya existentes, la fecha de
  creación es aproximada (inicio de la tarea o detección del riesgo) y el historial
  empieza con el estado de cada tarea en el momento de aplicar la migración.
- Las horas imputadas se descartan (la fuente de verdad de las horas es Jira): la
  migración `EliminarImputaciones` borra la tabla que había creado la anterior.

**Ficha de tarea**
- La descripción admite **Markdown** con el mismo editor que los eventos (barra de
  formato, vista previa y caja que crece al escribir).

**Planificación y capacidad**
- Nueva página **Capacidad**: ocupación por persona y semana según la estimación de sus
  tareas repartida entre las semanas que duran, descontando vacaciones y festivos de la
  capacidad, con las tareas vencidas y sin fechas aparte y el desglose de cada semana.
- **Aviso de ausencias** en el formulario de tarea si el responsable tiene vacaciones o
  festivos dentro de las fechas planificadas.
- **Dependencias entre tareas** («bloqueada por»), sin ciclos. El Gantt de tareas dibuja
  las flechas, marca en rojo las incumplidas, avisa al arrastrar una tarea que rompe una
  dependencia y permite mover las sucesoras.

**Analíticas**
- Tareas creadas frente a cerradas, tiempo medio en cada estado y tiempo medio bloqueada
  (a partir del historial).

### 1.4.1 — 2026-11-16

**Vacaciones y festivos**
- Nuevo tipo **Festivo** (nacional, autonómico/regional, local u otro) que se asigna a
  las personas a las que afecta, con atajos para seleccionar a todas o a un equipo
  completo. Se muestran en verde en el calendario de vacaciones (entidad `Festivo`,
  migración `AddFestivos`, `/api/festivos`).
- Exportación de vacaciones y festivos a **Excel** con hoja de resumen por persona
  (días naturales y laborables, descontando fines de semana y festivos).
- Selector de rango de fechas con calendario y búsqueda de persona en el formulario.

**Calendario y eventos**
- Descripción de eventos con editor **Markdown** (barra de formato, vista previa y
  caja que crece al escribir).
- Nuevo selector de inicio y fin con calendario, hora en formato 24 h y duraciones
  rápidas.
- Proyecto, equipo y persona con autocompletado.
- Tipo de evento elegido con pestañas. Desaparece el tipo de evento «Hito»: la
  pestaña **Hito** crea un hito de proyecto. La migración `EliminarEventosHito`
  convierte los eventos «Hito» con proyecto en hitos y deja los demás como «Otro».
- Los hitos de proyecto aparecen en el calendario.

**Proyectos, tareas e hitos**
- «Proyectos» pasa a ser un desplegable con **Lista de proyectos** y el nuevo
  **Gantt de proyectos**.
- Nueva **lista de Hitos** dentro de Tareas (`GET /api/hitos`).
- Gantt de tareas con **nueva paleta** (un color distinto por estado, legible en
  claro y oscuro) y **leyenda** compartida con el Gantt de proyectos.
- Todos los selectores de fecha restantes (cierre, revisión de bloqueo, riesgos,
  proyectos, hitos) usan el calendario moderno.

**Dashboard y analíticas**
- Dashboard con bloque **Hoy** (agenda, tareas de hoy y ausencias), indicadores
  clicables con su listado, listas con scroll y apertura directa de tareas y eventos.
- **Analíticas** rehechas: filtros por equipo, proyecto, persona y periodo, nuevos
  KPIs y gráficas (flujo de entrega, composición, capacidad, salud de proyectos,
  hitos, matriz de riesgos).

**Correcciones**
- La fecha de «hoy» del backend se calculaba solo al arrancar: las tareas no pasaban
  a vencidas hasta reiniciarlo.
- Cambiar el estado de un hito desde la ficha de proyecto enviaba solo el estado y
  podía perder el nombre y la fecha.
- `package-lock.json` apuntaba a un registro npm privado y rompía el build de Docker;
  se añade `frontend/.npmrc` con el registro público.

### 1.4.0 — 2026-11-10
- Menú lateral con desplegables (**Tareas** y **Tableros Kanban**); la vista Gantt ya
  no marca también la lista de tareas como activa.
- Formulario de tarea: proyecto y responsable con selector de búsqueda de una sola
  opción, y fechas de inicio y objetivo en un único calendario de rango.

### 1.3.0 — 2026-11-09
- **Gantt de tareas** (sustituye al mapa de tareas): vistas por persona, equipo y
  proyecto, escalas de días, semanas y meses, y relaciones entre tareas.
- Mover y redimensionar tareas en el Gantt para cambiar sus fechas, y crear tareas
  haciendo clic en un hueco.
- Selector múltiple con búsqueda para las tareas relacionadas.

### 1.2.0 — 2026-11-09
- **Integración real con Jira Cloud**: configuración desde la aplicación, catálogo de
  espacios Jira para enlazar proyectos, «Comprobar en Jira» en las tareas, estado en
  vivo de los tickets con caché de 5 minutos y pestaña Jira en la ficha de proyecto.

### 1.1.0 — 2026-10-30
- Relaciones entre tareas, nueva página global de **Tareas** y mapa de tareas.
- Enlaces a Jira en proyectos y tareas, y correcciones menores.
- **Vacaciones**: vista mensual por persona y alta/edición de periodos (incluida en
  esta etapa; el commit no llevaba número de versión).

### 1.0.1 — 2026-10-29
- Tablero Kanban **por proyecto**, chip de prioridad y mejoras en riesgos, bloqueos,
  dashboard y fichas.
- `.dockerignore`, `.nvmrc`, configuración de oxlint y `.env.example`.

### 1.0.0 — 2026-10-29
- Versión inicial: dashboard, personas, equipos, proyectos con hitos, tareas, tableros
  Kanban por equipo y por usuario, calendario de eventos, analíticas, riesgos y
  bloqueos, notas, configuración y autenticación del coordinador.
