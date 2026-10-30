namespace DHub.Api.Dtos;

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
