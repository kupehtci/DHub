using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

public record EquipoDto(
    Guid Id,
    string Nombre,
    Guid? LiderTecnicoId,
    string? LiderTecnicoNombre,
    string? Descripcion,
    EstadoEquipo Estado,
    int NumeroMiembros,
    int ProyectosActivos
);

public record EquipoDetalleDto(
    Guid Id,
    string Nombre,
    Guid? LiderTecnicoId,
    string? LiderTecnicoNombre,
    string? Descripcion,
    EstadoEquipo Estado,
    List<PersonaDto> Miembros,
    List<ProyectoDto> Proyectos
);

public record EquipoCreateDto(
    string Nombre,
    Guid? LiderTecnicoId,
    string? Descripcion,
    EstadoEquipo Estado
);

public record EquipoUpdateDto(
    string Nombre,
    Guid? LiderTecnicoId,
    string? Descripcion,
    EstadoEquipo Estado
);

public record TableroPorPersonaDto(
    Guid? PersonaId,
    string PersonaNombre,
    decimal CargaHoras,
    List<TareaDto> Tareas
);
