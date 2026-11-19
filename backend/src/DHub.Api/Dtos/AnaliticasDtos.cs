using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

// Hito con los datos de su proyecto, para las analíticas de cumplimiento de hitos.
public record HitoAnaliticaDto(
    Guid Id,
    Guid ProyectoId,
    string ProyectoCodigo,
    string ProyectoNombre,
    Guid? EquipoId,
    string Nombre,
    DateOnly Fecha,
    EstadoHito Estado
);

// Tiempo total y medio que las tareas filtradas han pasado en cada estado (según su historial).
public record TiemposEstadoDto(
    List<TiempoEstadoDto> Estados,
    int EpisodiosBloqueo,
    int BloqueosAbiertos,
    double? MediaDiasBloqueo,
    // Primera fecha con historial: antes de ella no hay datos de cambios de estado.
    DateTime? HistorialDesde
);

public record TiempoEstadoDto(EstadoTarea Estado, double DiasTotales, int Tareas, double MediaDias);
