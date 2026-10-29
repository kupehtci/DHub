using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

public record TareaDto(
    Guid Id,
    string Titulo,
    string? Descripcion,
    TipoTarea Tipo,
    EstadoTarea Estado,
    Prioridad Prioridad,
    Guid ProyectoId,
    string ProyectoNombre,
    string ProyectoCodigo,
    Guid? EquipoId,
    string? EquipoNombre,
    Guid? ResponsableId,
    string? ResponsableNombre,
    decimal EstimacionHoras,
    DateOnly? FechaInicio,
    DateOnly? FechaObjetivo,
    DateOnly? FechaCierre,
    bool EstaVencida,
    string? MotivoBloqueo,
    Guid? ResponsableBloqueoId,
    string? ResponsableBloqueoNombre,
    DateOnly? FechaRevisionBloqueo,
    string? JiraTicketUrl,
    string? JiraTicketClave,
    List<TareaRelacionadaDto> Relacionadas
);

// Resumen de una tarea relacionada, para mostrar en la tabla, el panel de edición y el mapa.
public record TareaRelacionadaDto(
    Guid Id,
    string Titulo,
    string ProyectoCodigo,
    EstadoTarea Estado,
    Prioridad Prioridad
);

public record TareaRelacionesUpdateDto(List<Guid> RelacionadasIds);

public record TareaCreateDto(
    string Titulo,
    string? Descripcion,
    TipoTarea Tipo,
    EstadoTarea Estado,
    Prioridad Prioridad,
    Guid ProyectoId,
    Guid? ResponsableId,
    decimal EstimacionHoras,
    DateOnly? FechaInicio,
    DateOnly? FechaObjetivo,
    DateOnly? FechaCierre,
    string? MotivoBloqueo,
    Guid? ResponsableBloqueoId,
    DateOnly? FechaRevisionBloqueo,
    string? JiraTicketUrl,
    string? JiraTicketClave
);

public record TareaUpdateDto(
    string Titulo,
    string? Descripcion,
    TipoTarea Tipo,
    EstadoTarea Estado,
    Prioridad Prioridad,
    Guid ProyectoId,
    Guid? ResponsableId,
    decimal EstimacionHoras,
    DateOnly? FechaInicio,
    DateOnly? FechaObjetivo,
    DateOnly? FechaCierre,
    string? MotivoBloqueo,
    Guid? ResponsableBloqueoId,
    DateOnly? FechaRevisionBloqueo,
    string? JiraTicketUrl,
    string? JiraTicketClave
);

public record TareaEstadoUpdateDto(EstadoTarea Estado);
