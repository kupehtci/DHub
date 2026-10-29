using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

public record EventoDto(
    Guid Id,
    string Titulo,
    string? Descripcion,
    TipoEvento Tipo,
    DateTime FechaInicio,
    DateTime? FechaFin,
    Guid? ProyectoId,
    string? ProyectoNombre,
    Guid? EquipoId,
    string? EquipoNombre,
    Guid? PersonaId,
    string? PersonaNombre
);

public record EventoCreateDto(
    string Titulo,
    string? Descripcion,
    TipoEvento Tipo,
    DateTime FechaInicio,
    DateTime? FechaFin,
    Guid? ProyectoId,
    Guid? EquipoId,
    Guid? PersonaId
);

public record EventoUpdateDto(
    string Titulo,
    string? Descripcion,
    TipoEvento Tipo,
    DateTime FechaInicio,
    DateTime? FechaFin,
    Guid? ProyectoId,
    Guid? EquipoId,
    Guid? PersonaId
);
