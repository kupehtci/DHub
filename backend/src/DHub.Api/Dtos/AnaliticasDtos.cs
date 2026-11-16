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
