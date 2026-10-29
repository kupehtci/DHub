using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

public record RiesgoDto(
    Guid Id,
    Guid? ProyectoId,
    string? ProyectoNombre,
    Guid? TareaId,
    string? TareaTitulo,
    string Titulo,
    string? Descripcion,
    ImpactoRiesgo Impacto,
    ProbabilidadRiesgo Probabilidad,
    Guid? ResponsableId,
    string? ResponsableNombre,
    EstadoRiesgo Estado,
    DateOnly FechaDeteccion,
    DateOnly? FechaRevision
);

public record RiesgoCreateDto(
    Guid? ProyectoId,
    Guid? TareaId,
    string Titulo,
    string? Descripcion,
    ImpactoRiesgo Impacto,
    ProbabilidadRiesgo Probabilidad,
    Guid? ResponsableId,
    EstadoRiesgo Estado,
    DateOnly FechaDeteccion,
    DateOnly? FechaRevision
);

public record RiesgoUpdateDto(
    Guid? ProyectoId,
    Guid? TareaId,
    string Titulo,
    string? Descripcion,
    ImpactoRiesgo Impacto,
    ProbabilidadRiesgo Probabilidad,
    Guid? ResponsableId,
    EstadoRiesgo Estado,
    DateOnly FechaDeteccion,
    DateOnly? FechaRevision
);
