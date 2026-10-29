using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

public record ProyectoDto(
    Guid Id,
    string Nombre,
    string Codigo,
    string SistemaInformacion,
    string ClienteArea,
    Guid? ResponsableId,
    string? ResponsableNombre,
    Guid? EquipoId,
    string? EquipoNombre,
    EstadoProyecto Estado,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    Prioridad Prioridad,
    string? JiraClaveProyecto,
    string? JiraProyectoUrl,
    int TareasTotal,
    int TareasVencidas,
    int TareasBloqueadas,
    int RiesgosAltos
);

public record ProyectoDetalleDto(
    Guid Id,
    string Nombre,
    string Codigo,
    string SistemaInformacion,
    string ClienteArea,
    Guid? ResponsableId,
    string? ResponsableNombre,
    Guid? EquipoId,
    string? EquipoNombre,
    EstadoProyecto Estado,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    Prioridad Prioridad,
    string? JiraClaveProyecto,
    string? JiraProyectoUrl,
    List<HitoDto> Hitos,
    List<TareaDto> Tareas,
    List<RiesgoDto> Riesgos,
    List<NotaDto> Notas
);

public record ProyectoCreateDto(
    string Nombre,
    string Codigo,
    string SistemaInformacion,
    string ClienteArea,
    Guid? ResponsableId,
    Guid? EquipoId,
    EstadoProyecto Estado,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    Prioridad Prioridad,
    string? JiraClaveProyecto,
    string? JiraProyectoUrl
);

public record ProyectoUpdateDto(
    string Nombre,
    string Codigo,
    string SistemaInformacion,
    string ClienteArea,
    Guid? ResponsableId,
    Guid? EquipoId,
    EstadoProyecto Estado,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    Prioridad Prioridad,
    string? JiraClaveProyecto,
    string? JiraProyectoUrl
);

public record HitoDto(
    Guid Id,
    Guid ProyectoId,
    string Nombre,
    DateOnly Fecha,
    EstadoHito Estado,
    string? Descripcion
);

public record HitoCreateDto(
    Guid ProyectoId,
    string Nombre,
    DateOnly Fecha,
    EstadoHito Estado,
    string? Descripcion
);

public record HitoUpdateDto(
    string Nombre,
    DateOnly Fecha,
    EstadoHito Estado,
    string? Descripcion
);
