using Panorama.Domain.Enums;

namespace Panorama.Api.Dtos;

public record VacacionDto(
    Guid Id,
    Guid PersonaId,
    string PersonaNombre,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    int Dias,
    string? Comentario
);

public record VacacionCreateDto(Guid PersonaId, DateOnly FechaInicio, DateOnly FechaFin, string? Comentario);

public record VacacionUpdateDto(DateOnly FechaInicio, DateOnly FechaFin, string? Comentario);

public record FestivoDto(
    Guid Id,
    string Nombre,
    AmbitoFestivo Ambito,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    int Dias,
    string? Comentario,
    List<Guid> PersonaIds
);

public record FestivoSaveDto(
    string Nombre,
    AmbitoFestivo Ambito,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    string? Comentario,
    List<Guid> PersonaIds
);
