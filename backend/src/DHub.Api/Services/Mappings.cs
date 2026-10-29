using DHub.Api.Dtos;
using DHub.Domain.Entities;
using DHub.Domain.Enums;

namespace DHub.Api.Services;

public static class Mappings
{
    private static readonly DateOnly Hoy = DateOnly.FromDateTime(DateTime.UtcNow);

    public static bool EsVencida(this Tarea t) =>
        t.FechaObjetivo.HasValue && t.FechaObjetivo.Value < Hoy
        && t.Estado != EstadoTarea.Hecha && t.Estado != EstadoTarea.Cancelada;

    public static TareaDto ToDto(this Tarea t) => new(
        t.Id,
        t.Titulo,
        t.Descripcion,
        t.Tipo,
        t.Estado,
        t.Prioridad,
        t.ProyectoId,
        t.Proyecto?.Nombre ?? string.Empty,
        t.Proyecto?.Codigo ?? string.Empty,
        t.Proyecto?.EquipoId,
        t.Proyecto?.Equipo?.Nombre,
        t.ResponsableId,
        t.Responsable?.Nombre,
        t.EstimacionHoras,
        t.FechaInicio,
        t.FechaObjetivo,
        t.FechaCierre,
        t.EsVencida(),
        t.MotivoBloqueo,
        t.ResponsableBloqueoId,
        t.ResponsableBloqueo?.Nombre,
        t.FechaRevisionBloqueo,
        t.JiraTicketUrl,
        t.JiraTicketClave
    );

    public static bool EsActiva(this Tarea t) =>
        t.Estado is EstadoTarea.Planificada or EstadoTarea.EnCurso or EstadoTarea.EnRevision or EstadoTarea.Bloqueada;

    public static PersonaDto ToDto(this Persona p)
    {
        var tareas = p.TareasAsignadas ?? new List<Tarea>();
        var activas = tareas.Where(t => t.EsActiva()).ToList();
        return new PersonaDto(
            p.Id,
            p.Nombre,
            p.Email,
            p.Rol,
            (p.Equipos ?? new List<Equipo>()).OrderBy(e => e.Nombre).Select(e => new EquipoResumenDto(e.Id, e.Nombre)).ToList(),
            p.DisponibilidadSemanalHoras,
            p.Estado,
            activas.Sum(t => t.EstimacionHoras),
            activas.Count,
            tareas.Count(t => t.Estado == EstadoTarea.Bloqueada),
            tareas.Count(t => t.EsVencida())
        );
    }

    public static EquipoDto ToDto(this Equipo e) => new(
        e.Id,
        e.Nombre,
        e.LiderTecnicoId,
        e.LiderTecnico?.Nombre,
        e.Descripcion,
        e.Estado,
        e.Miembros?.Count ?? 0,
        e.Proyectos?.Count(p => p.Estado == EstadoProyecto.EnCurso) ?? 0
    );

    public static ProyectoDto ToDto(this Proyecto p)
    {
        var tareas = p.Tareas ?? new List<Tarea>();
        return new ProyectoDto(
            p.Id,
            p.Nombre,
            p.Codigo,
            p.SistemaInformacion,
            p.ClienteArea,
            p.ResponsableId,
            p.Responsable?.Nombre,
            p.EquipoId,
            p.Equipo?.Nombre,
            p.Estado,
            p.FechaInicio,
            p.FechaFin,
            p.Prioridad,
            p.JiraClaveProyecto,
            p.JiraProyectoUrl,
            tareas.Count,
            tareas.Count(t => t.EsVencida()),
            tareas.Count(t => t.Estado == EstadoTarea.Bloqueada),
            (p.Riesgos ?? new List<Riesgo>()).Count(r => r.Impacto is ImpactoRiesgo.Alto or ImpactoRiesgo.Critico
                && r.Estado != EstadoRiesgo.Cerrado && r.Estado != EstadoRiesgo.Mitigado)
        );
    }

    public static HitoDto ToDto(this Hito h) => new(h.Id, h.ProyectoId, h.Nombre, h.Fecha, h.Estado, h.Descripcion);

    public static RiesgoDto ToDto(this Riesgo r) => new(
        r.Id,
        r.ProyectoId,
        r.Proyecto?.Nombre,
        r.TareaId,
        r.Tarea?.Titulo,
        r.Titulo,
        r.Descripcion,
        r.Impacto,
        r.Probabilidad,
        r.ResponsableId,
        r.Responsable?.Nombre,
        r.Estado,
        r.FechaDeteccion,
        r.FechaRevision
    );

    public static EventoDto ToDto(this Evento e) => new(
        e.Id,
        e.Titulo,
        e.Descripcion,
        e.Tipo,
        e.FechaInicio,
        e.FechaFin,
        e.ProyectoId,
        e.Proyecto?.Nombre,
        e.EquipoId,
        e.Equipo?.Nombre,
        e.PersonaId,
        e.Persona?.Nombre
    );

    public static NotaDto ToDto(this Nota n) => new(
        n.Id,
        n.Fecha,
        n.AutorId,
        n.Autor?.Nombre ?? string.Empty,
        n.Tipo,
        n.Texto,
        n.ProyectoId,
        n.Proyecto?.Nombre,
        n.TareaId,
        n.Tarea?.Titulo,
        n.PersonaId,
        n.Persona?.Nombre
    );
}
