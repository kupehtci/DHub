using DHub.Domain.Entities;
using DHub.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace DHub.Infrastructure.Data.Seed;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Personas.AnyAsync())
        {
            return;
        }

        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var ahora = DateTime.UtcNow;
        static DateTime EnUtc(DateOnly fecha, TimeOnly hora) => DateTime.SpecifyKind(fecha.ToDateTime(hora), DateTimeKind.Utc);

        var equipoBackend = new Equipo { Nombre = "Equipo Backend Core", Descripcion = "Servicios, APIs e integraciones backend de los sistemas de información.", Estado = EstadoEquipo.Activo };
        var equipoFrontend = new Equipo { Nombre = "Equipo Frontend", Descripcion = "Interfaces de usuario y experiencia de los portales y aplicaciones.", Estado = EstadoEquipo.Activo };
        var equipoDatos = new Equipo { Nombre = "Equipo Datos e Integraciones", Descripcion = "Interoperabilidad, migraciones y plataforma de datos.", Estado = EstadoEquipo.Activo };

        var laura = new Persona { Nombre = "Laura Gómez", Email = "laura.gomez@hiberus.com", Rol = "Tech Lead Backend", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Activo };
        var carlos = new Persona { Nombre = "Carlos Ruiz", Email = "carlos.ruiz@hiberus.com", Rol = "Tech Lead Frontend", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Activo };
        var marta = new Persona { Nombre = "Marta Serrano", Email = "marta.serrano@hiberus.com", Rol = "Tech Lead Datos", DisponibilidadSemanalHoras = 32, Estado = EstadoPersona.Activo };
        var javier = new Persona { Nombre = "Javier Molina", Email = "javier.molina@hiberus.com", Rol = "Backend Developer", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Activo };
        var anabelen = new Persona { Nombre = "Ana Belén Torres", Email = "anabelen.torres@hiberus.com", Rol = "Backend Developer", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Vacaciones };
        var sergio = new Persona { Nombre = "Sergio Navarro", Email = "sergio.navarro@hiberus.com", Rol = "Frontend Developer", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Activo };
        var elena = new Persona { Nombre = "Elena Castro", Email = "elena.castro@hiberus.com", Rol = "Frontend Developer", DisponibilidadSemanalHoras = 20, Estado = EstadoPersona.Activo };
        var david = new Persona { Nombre = "David Ortega", Email = "david.ortega@hiberus.com", Rol = "QA Engineer", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Activo };
        var patricia = new Persona { Nombre = "Patricia Díaz", Email = "patricia.diaz@hiberus.com", Rol = "Data Engineer", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Activo };
        var pablo = new Persona { Nombre = "Pablo Iglesias", Email = "pablo.iglesias@hiberus.com", Rol = "DevOps Engineer", DisponibilidadSemanalHoras = 40, Estado = EstadoPersona.Activo };

        // Una persona puede pertenecer a varios equipos a la vez (p. ej. QA y DevOps dan soporte transversal).
        laura.Equipos.Add(equipoBackend);
        laura.Equipos.Add(equipoDatos);
        javier.Equipos.Add(equipoBackend);
        anabelen.Equipos.Add(equipoBackend);
        carlos.Equipos.Add(equipoFrontend);
        sergio.Equipos.Add(equipoFrontend);
        elena.Equipos.Add(equipoFrontend);
        david.Equipos.Add(equipoFrontend);
        david.Equipos.Add(equipoBackend);
        marta.Equipos.Add(equipoDatos);
        patricia.Equipos.Add(equipoDatos);
        pablo.Equipos.Add(equipoBackend);
        pablo.Equipos.Add(equipoFrontend);
        pablo.Equipos.Add(equipoDatos);

        var personas = new[] { laura, carlos, marta, javier, anabelen, sergio, elena, david, patricia, pablo };
        var equipos = new[] { equipoBackend, equipoFrontend, equipoDatos };

        // Se guardan primero equipos y personas sin el líder técnico para evitar
        // una dependencia circular (Equipo -> LiderTecnico -> Persona -> Equipo) en el mismo SaveChanges.
        db.Equipos.AddRange(equipos);
        db.Personas.AddRange(personas);
        await db.SaveChangesAsync();

        equipoBackend.LiderTecnico = laura;
        equipoFrontend.LiderTecnico = carlos;
        equipoDatos.LiderTecnico = marta;
        await db.SaveChangesAsync();

        var sigex = new Proyecto
        {
            Nombre = "Sistema de Gestión de Expedientes",
            Codigo = "SIGEX",
            SistemaInformacion = "SIGEX",
            ClienteArea = "Dirección General de Administración Digital",
            Responsable = laura,
            Equipo = equipoBackend,
            Estado = EstadoProyecto.EnCurso,
            FechaInicio = hoy.AddMonths(-8),
            FechaFin = hoy.AddMonths(3),
            Prioridad = Prioridad.Alta,
            JiraClaveProyecto = "SIGEX",
            JiraProyectoUrl = "https://ministerio-tic.atlassian.net/jira/software/projects/SIGEX/boards/1",
        };

        var portac = new Proyecto
        {
            Nombre = "Portal de Atención Ciudadana",
            Codigo = "PORTAC",
            SistemaInformacion = "PORTAC",
            ClienteArea = "Subdirección de Atención al Ciudadano",
            Responsable = carlos,
            Equipo = equipoFrontend,
            Estado = EstadoProyecto.EnCurso,
            FechaInicio = hoy.AddMonths(-4),
            FechaFin = hoy.AddMonths(1),
            Prioridad = Prioridad.Critica,
            JiraClaveProyecto = "PORTAC",
            JiraProyectoUrl = "https://ministerio-tic.atlassian.net/jira/software/projects/PORTAC/boards/2",
        };

        var pid = new Proyecto
        {
            Nombre = "Plataforma de Interoperabilidad de Datos",
            Codigo = "PID",
            SistemaInformacion = "PID",
            ClienteArea = "Oficina de Transformación Digital",
            Responsable = marta,
            Equipo = equipoDatos,
            Estado = EstadoProyecto.Planificado,
            FechaInicio = hoy.AddMonths(1),
            FechaFin = hoy.AddMonths(9),
            Prioridad = Prioridad.Media,
            JiraClaveProyecto = "PID",
            JiraProyectoUrl = "https://ministerio-tic.atlassian.net/jira/software/projects/PID/boards/3",
        };

        var proyectos = new[] { sigex, portac, pid };

        var tareaFirma = new Tarea
        {
            Titulo = "API de firma electrónica de resoluciones",
            Descripcion = "Integración con el proveedor de firma electrónica homologado.",
            Tipo = TipoTarea.HistoriaUsuario,
            Estado = EstadoTarea.Bloqueada,
            Prioridad = Prioridad.Alta,
            Proyecto = sigex,
            Responsable = javier,
            EstimacionHoras = 40,
            FechaInicio = hoy.AddDays(-30),
            FechaObjetivo = hoy.AddDays(-5),
            MotivoBloqueo = "Pendiente de credenciales del entorno de certificación del proveedor de firma.",
            ResponsableBloqueo = laura,
            FechaRevisionBloqueo = hoy.AddDays(2),
            JiraTicketClave = "SIGEX-101",
            JiraTicketUrl = "https://ministerio-tic.atlassian.net/browse/SIGEX-101",
        };

        var tareaAccesibilidad = new Tarea
        {
            Titulo = "Accesibilidad AA del formulario de solicitud",
            Descripcion = "Cumplimiento WCAG 2.1 AA en el formulario principal de solicitud de trámites.",
            Tipo = TipoTarea.Tarea,
            Estado = EstadoTarea.Bloqueada,
            Prioridad = Prioridad.Critica,
            Proyecto = portac,
            Responsable = elena,
            EstimacionHoras = 18,
            FechaInicio = hoy.AddDays(-10),
            FechaObjetivo = hoy.AddDays(-2),
            MotivoBloqueo = "A la espera de la auditoría de accesibilidad externa.",
            ResponsableBloqueo = carlos,
            FechaRevisionBloqueo = hoy.AddDays(1),
            JiraTicketClave = "PORTAC-58",
            JiraTicketUrl = "https://ministerio-tic.atlassian.net/browse/PORTAC-58",
        };

        var tareaConcurrencia = new Tarea
        {
            Titulo = "Corregir error de concurrencia al archivar expedientes",
            Descripcion = "Condición de carrera al archivar expedientes desde dos sesiones simultáneas.",
            Tipo = TipoTarea.Bug,
            Estado = EstadoTarea.EnCurso,
            Prioridad = Prioridad.Critica,
            Proyecto = sigex,
            Responsable = javier,
            EstimacionHoras = 8,
            FechaInicio = hoy.AddDays(-3),
            FechaObjetivo = hoy.AddDays(-1),
            JiraTicketClave = "SIGEX-114",
            JiraTicketUrl = "https://ministerio-tic.atlassian.net/browse/SIGEX-114",
        };

        var tareas = new List<Tarea>
        {
            new()
            {
                Titulo = "Diseñar modelo de datos de expedientes",
                Descripcion = "Definir entidades y relaciones del núcleo de expedientes administrativos.",
                Tipo = TipoTarea.Tarea,
                Estado = EstadoTarea.Hecha,
                Prioridad = Prioridad.Alta,
                Proyecto = sigex,
                Responsable = laura,
                EstimacionHoras = 24,
                FechaInicio = hoy.AddMonths(-8),
                FechaObjetivo = hoy.AddMonths(-7).AddDays(-20),
                FechaCierre = hoy.AddMonths(-7).AddDays(-22),
            },
            tareaFirma,
            tareaConcurrencia,
            new()
            {
                Titulo = "Exportación masiva de expedientes a PDF",
                Tipo = TipoTarea.Mejora,
                Estado = EstadoTarea.EnRevision,
                Prioridad = Prioridad.Media,
                Proyecto = sigex,
                Responsable = anabelen,
                EstimacionHoras = 16,
                FechaInicio = hoy.AddDays(-14),
                FechaObjetivo = hoy.AddDays(3),
            },
            new()
            {
                Titulo = "Plan de pruebas de carga del módulo de expedientes",
                Tipo = TipoTarea.Tarea,
                Estado = EstadoTarea.Backlog,
                Prioridad = Prioridad.Baja,
                Proyecto = sigex,
                Responsable = null,
                EstimacionHoras = 12,
            },
            new()
            {
                Titulo = "Rediseño del buscador de trámites",
                Tipo = TipoTarea.HistoriaUsuario,
                Estado = EstadoTarea.EnCurso,
                Prioridad = Prioridad.Alta,
                Proyecto = portac,
                Responsable = sergio,
                EstimacionHoras = 20,
                FechaInicio = hoy.AddDays(-5),
                FechaObjetivo = hoy.AddDays(4),
            },
            tareaAccesibilidad,
            new()
            {
                Titulo = "Pruebas funcionales del área privada del ciudadano",
                Tipo = TipoTarea.Tarea,
                Estado = EstadoTarea.EnRevision,
                Prioridad = Prioridad.Alta,
                Proyecto = portac,
                Responsable = david,
                EstimacionHoras = 14,
                FechaInicio = hoy.AddDays(-7),
                FechaObjetivo = hoy.AddDays(2),
            },
            new()
            {
                Titulo = "Notificaciones push de estado de trámite",
                Tipo = TipoTarea.HistoriaUsuario,
                Estado = EstadoTarea.Planificada,
                Prioridad = Prioridad.Media,
                Proyecto = portac,
                Responsable = sergio,
                EstimacionHoras = 16,
                FechaObjetivo = hoy.AddDays(15),
            },
            new()
            {
                Titulo = "Error de traducción en el catálogo de trámites",
                Tipo = TipoTarea.Bug,
                Estado = EstadoTarea.Hecha,
                Prioridad = Prioridad.Baja,
                Proyecto = portac,
                Responsable = elena,
                EstimacionHoras = 2,
                FechaInicio = hoy.AddDays(-6),
                FechaObjetivo = hoy.AddDays(-5),
                FechaCierre = hoy.AddDays(-5),
            },
            new()
            {
                Titulo = "Catálogo común de sistemas de información",
                Tipo = TipoTarea.Tarea,
                Estado = EstadoTarea.Backlog,
                Prioridad = Prioridad.Media,
                Proyecto = pid,
                Responsable = patricia,
                EstimacionHoras = 30,
            },
            new()
            {
                Titulo = "Definir contrato de interoperabilidad (API Gateway)",
                Tipo = TipoTarea.Tarea,
                Estado = EstadoTarea.Planificada,
                Prioridad = Prioridad.Media,
                Proyecto = pid,
                Responsable = marta,
                EstimacionHoras = 24,
                FechaObjetivo = hoy.AddDays(25),
            },
            new()
            {
                Titulo = "Spike: evaluación de herramientas de ETL",
                Tipo = TipoTarea.Tarea,
                Estado = EstadoTarea.Cancelada,
                Prioridad = Prioridad.Baja,
                Proyecto = pid,
                Responsable = null,
                EstimacionHoras = 8,
            },
            // Tareas adicionales ya completadas en semanas anteriores, para poblar las analíticas de tendencia.
            new() { Titulo = "Migrar pipeline CI a nueva agent pool", Tipo = TipoTarea.Tarea, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Media, Proyecto = sigex, Responsable = pablo, EstimacionHoras = 6, FechaCierre = hoy.AddDays(-7) },
            new() { Titulo = "Actualizar dependencias de seguridad backend", Tipo = TipoTarea.Tarea, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Alta, Proyecto = sigex, Responsable = javier, EstimacionHoras = 4, FechaCierre = hoy.AddDays(-10) },
            new() { Titulo = "Revisión de contraste de color del portal", Tipo = TipoTarea.Tarea, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Baja, Proyecto = portac, Responsable = elena, EstimacionHoras = 5, FechaCierre = hoy.AddDays(-13) },
            new() { Titulo = "Optimizar consultas del listado de expedientes", Tipo = TipoTarea.Mejora, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Media, Proyecto = sigex, Responsable = laura, EstimacionHoras = 10, FechaCierre = hoy.AddDays(-18) },
            new() { Titulo = "Documentar API pública de trámites", Tipo = TipoTarea.Tarea, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Baja, Proyecto = portac, Responsable = sergio, EstimacionHoras = 6, FechaCierre = hoy.AddDays(-20) },
            new() { Titulo = "Configurar monitorización de disponibilidad", Tipo = TipoTarea.Tarea, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Media, Proyecto = sigex, Responsable = pablo, EstimacionHoras = 8, FechaCierre = hoy.AddDays(-25) },
            new() { Titulo = "Pruebas de penetración básicas del portal", Tipo = TipoTarea.Tarea, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Alta, Proyecto = portac, Responsable = david, EstimacionHoras = 12, FechaCierre = hoy.AddDays(-32) },
            new() { Titulo = "Normalizar catálogo de códigos postales", Tipo = TipoTarea.Tarea, Estado = EstadoTarea.Hecha, Prioridad = Prioridad.Baja, Proyecto = pid, Responsable = patricia, EstimacionHoras = 6, FechaCierre = hoy.AddDays(-40) },
        };

        var hitos = new List<Hito>
        {
            new() { Proyecto = sigex, Nombre = "Entrega módulo de firma electrónica", Fecha = hoy.AddDays(10), Estado = EstadoHito.EnRiesgo, Descripcion = "Depende del desbloqueo de credenciales del proveedor." },
            new() { Proyecto = sigex, Nombre = "Puesta en producción SIGEX v2", Fecha = hoy.AddMonths(3), Estado = EstadoHito.Pendiente },
            new() { Proyecto = portac, Nombre = "Auditoría de accesibilidad", Fecha = hoy.AddDays(5), Estado = EstadoHito.EnRiesgo },
            new() { Proyecto = portac, Nombre = "Lanzamiento Portal de Atención Ciudadana", Fecha = hoy.AddMonths(1), Estado = EstadoHito.Pendiente },
            new() { Proyecto = pid, Nombre = "Kick-off plataforma de interoperabilidad", Fecha = hoy.AddMonths(1), Estado = EstadoHito.Pendiente },
        };

        var riesgos = new List<Riesgo>
        {
            new()
            {
                Proyecto = sigex,
                Tarea = tareaFirma,
                Titulo = "Retraso del proveedor de firma electrónica",
                Descripcion = "El proveedor externo no ha facilitado aún las credenciales de certificación, lo que puede retrasar la entrega del hito.",
                Impacto = ImpactoRiesgo.Alto,
                Probabilidad = ProbabilidadRiesgo.Alta,
                Responsable = laura,
                Estado = EstadoRiesgo.EnMitigacion,
                FechaDeteccion = hoy.AddDays(-15),
                FechaRevision = hoy.AddDays(2),
            },
            new()
            {
                Proyecto = portac,
                Tarea = tareaAccesibilidad,
                Titulo = "Incumplimiento de plazos de accesibilidad",
                Descripcion = "La auditoría externa de accesibilidad podría no completarse antes del lanzamiento.",
                Impacto = ImpactoRiesgo.Critico,
                Probabilidad = ProbabilidadRiesgo.Media,
                Responsable = carlos,
                Estado = EstadoRiesgo.Identificado,
                FechaDeteccion = hoy.AddDays(-8),
                FechaRevision = hoy.AddDays(1),
            },
            new()
            {
                Proyecto = pid,
                Titulo = "Dependencia de disponibilidad del equipo de datos",
                Descripcion = "El equipo de datos está parcialmente comprometido en PID en sus fases iniciales.",
                Impacto = ImpactoRiesgo.Medio,
                Probabilidad = ProbabilidadRiesgo.Media,
                Responsable = marta,
                Estado = EstadoRiesgo.Identificado,
                FechaDeteccion = hoy.AddDays(-2),
                FechaRevision = hoy.AddDays(20),
            },
        };

        var notas = new List<Nota>
        {
            new() { Autor = laura, Proyecto = sigex, Tipo = TipoNota.Seguimiento, Texto = "Reunión de seguimiento semanal: se confirma el bloqueo por credenciales del proveedor de firma.", Fecha = ahora.AddDays(-2) },
            new() { Autor = carlos, Proyecto = portac, Tarea = tareaAccesibilidad, Tipo = TipoNota.Bloqueo, Texto = "Se escala el bloqueo de accesibilidad al comité de proyecto.", Fecha = ahora.AddDays(-1) },
            new() { Autor = marta, Proyecto = pid, Tipo = TipoNota.Decision, Texto = "Se decide posponer el arranque de PID dos semanas para no solapar con el cierre de PORTAC.", Fecha = ahora.AddDays(-4) },
            new() { Autor = laura, Persona = javier, Tipo = TipoNota.General, Texto = "Javier asumirá temporalmente las tareas de Ana Belén durante sus vacaciones.", Fecha = ahora.AddDays(-6) },
            // Comentarios de tarea.
            new() { Autor = laura, Tarea = tareaFirma, Tipo = TipoNota.Comentario, Texto = "He escalado el ticket al proveedor por tercera vez, seguimos esperando respuesta.", Fecha = ahora.AddHours(-20) },
            new() { Autor = javier, Tarea = tareaFirma, Tipo = TipoNota.Comentario, Texto = "Mientras tanto dejo mockeado el servicio de firma para no bloquear el resto de la historia.", Fecha = ahora.AddHours(-5) },
            new() { Autor = carlos, Tarea = tareaAccesibilidad, Tipo = TipoNota.Comentario, Texto = "El auditor externo ha confirmado hueco para la semana que viene.", Fecha = ahora.AddHours(-3) },
            new() { Autor = javier, Tarea = tareaConcurrencia, Tipo = TipoNota.Comentario, Texto = "Reproducido en local añadiendo un bloqueo pesimista sobre el expediente.", Fecha = ahora.AddHours(-1) },
        };

        var eventos = new List<Evento>
        {
            new() { Titulo = "Comité de seguimiento SIGEX", Tipo = TipoEvento.Reunion, Proyecto = sigex, Persona = laura, FechaInicio = ahora.Date.AddDays(2).AddHours(10), FechaFin = ahora.Date.AddDays(2).AddHours(11), Descripcion = "Revisión quincenal de avance con el cliente." },
            new() { Titulo = "Daily equipo Frontend", Tipo = TipoEvento.Reunion, Equipo = equipoFrontend, FechaInicio = ahora.Date.AddHours(9).AddMinutes(30), FechaFin = ahora.Date.AddHours(9).AddMinutes(45) },
            new() { Titulo = "Daily equipo Backend Core", Tipo = TipoEvento.Reunion, Equipo = equipoBackend, FechaInicio = ahora.Date.AddHours(9).AddMinutes(15), FechaFin = ahora.Date.AddHours(9).AddMinutes(30) },
            new() { Titulo = "Entrega módulo de firma electrónica", Tipo = TipoEvento.Entrega, Proyecto = sigex, FechaInicio = EnUtc(hoy.AddDays(10), new TimeOnly(17, 0)), Descripcion = "Fecha límite comprometida con el cliente." },
            new() { Titulo = "Auditoría de accesibilidad (sesión in-situ)", Tipo = TipoEvento.Reunion, Proyecto = portac, Persona = carlos, FechaInicio = EnUtc(hoy.AddDays(5), new TimeOnly(9, 30)), FechaFin = EnUtc(hoy.AddDays(5), new TimeOnly(13, 0)) },
            new() { Titulo = "Planificación de arranque PID", Tipo = TipoEvento.Reunion, Proyecto = pid, FechaInicio = ahora.Date.AddDays(7).AddHours(10), FechaFin = ahora.Date.AddDays(7).AddHours(12) },
            new() { Titulo = "Formación interna: accesibilidad web", Tipo = TipoEvento.Otro, Equipo = equipoFrontend, FechaInicio = ahora.Date.AddDays(3).AddHours(16), FechaFin = ahora.Date.AddDays(3).AddHours(18) },
            new() { Titulo = "Retrospectiva de sprint", Tipo = TipoEvento.Reunion, Equipo = equipoBackend, FechaInicio = ahora.Date.AddDays(-3).AddHours(12), FechaFin = ahora.Date.AddDays(-3).AddHours(13) },
            new() { Titulo = "Revisión mensual de cartera de proyectos", Tipo = TipoEvento.Reunion, FechaInicio = ahora.Date.AddMonths(1).AddHours(9), FechaFin = ahora.Date.AddMonths(1).AddHours(10).AddMinutes(30) },
        };

        db.Proyectos.AddRange(proyectos);
        db.Tareas.AddRange(tareas);
        db.Hitos.AddRange(hitos);
        db.Riesgos.AddRange(riesgos);
        db.Notas.AddRange(notas);
        db.Eventos.AddRange(eventos);

        await db.SaveChangesAsync();
    }
}
