using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

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
    List<HitoDto> ProximosHitos
);
