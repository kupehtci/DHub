using Panorama.Domain.Enums;

namespace Panorama.Api.Dtos;

public record NotaDto(
    Guid Id,
    DateTime Fecha,
    Guid AutorId,
    string AutorNombre,
    TipoNota Tipo,
    string Texto,
    Guid? ProyectoId,
    string? ProyectoNombre,
    Guid? TareaId,
    string? TareaTitulo,
    Guid? PersonaId,
    string? PersonaNombre
);

public record NotaCreateDto(
    Guid AutorId,
    TipoNota Tipo,
    string Texto,
    Guid? ProyectoId,
    Guid? TareaId,
    Guid? PersonaId
);

public record DashboardDto(
    int ProyectosActivos,
    int ProyectosEnRiesgo,
    int TareasVencidas,
    int TareasBloqueadas,
    int TareasSinResponsable,
    int RiesgosAltos,
    List<ProyectoDto> Proyectos,
    List<TareaDto> TareasVencidasList,
    List<TareaDto> TareasBloqueadasList,
    List<TareaDto> TareasSinResponsableList,
    List<RiesgoDto> RiesgosAltosList,
    List<HitoDto> ProximosHitos,
    List<Guid> ProyectosEnRiesgoIds,
    // Bloque "Hoy": tareas que empiezan o vencen hoy y quién está ausente.
    List<TareaDto> TareasHoyList,
    List<AusenciaHoyDto> AusenciasHoy
);

// Persona que hoy no trabaja, por vacaciones o por un festivo que le afecta.
public record AusenciaHoyDto(Guid PersonaId, string PersonaNombre, string Tipo, string? Detalle, DateOnly FechaFin);
