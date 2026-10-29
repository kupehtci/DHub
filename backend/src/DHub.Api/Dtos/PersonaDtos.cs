using DHub.Domain.Enums;

namespace DHub.Api.Dtos;

public record EquipoResumenDto(Guid Id, string Nombre);

public record PersonaDto(
    Guid Id,
    string Nombre,
    string Email,
    string Rol,
    List<EquipoResumenDto> Equipos,
    decimal DisponibilidadSemanalHoras,
    EstadoPersona Estado,
    decimal CargaHoras,
    int TareasActivas,
    int TareasBloqueadas,
    int TareasVencidas
);

public record PersonaDetalleDto(
    Guid Id,
    string Nombre,
    string Email,
    string Rol,
    List<EquipoResumenDto> Equipos,
    decimal DisponibilidadSemanalHoras,
    EstadoPersona Estado,
    decimal CargaHoras,
    List<TareaDto> TareasActivas,
    List<TareaDto> TareasPendientes,
    List<TareaDto> TareasBloqueadas,
    List<TareaDto> ProximasEntregas
);

public record PersonaCreateDto(
    string Nombre,
    string Email,
    string Rol,
    List<Guid> EquipoIds,
    decimal DisponibilidadSemanalHoras,
    EstadoPersona Estado
);

public record PersonaUpdateDto(
    string Nombre,
    string Email,
    string Rol,
    List<Guid> EquipoIds,
    decimal DisponibilidadSemanalHoras,
    EstadoPersona Estado
);
