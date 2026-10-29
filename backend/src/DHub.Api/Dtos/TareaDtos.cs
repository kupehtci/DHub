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
    string? JiraTicketClave
);

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
