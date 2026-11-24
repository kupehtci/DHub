namespace Panorama.Api.Dtos;

// Matriz de capacidad: una fila por persona y una celda por semana (de lunes a viernes).
public record CapacidadDto(DateOnly Desde, int Semanas, List<CapacidadPersonaDto> Personas);

public record CapacidadPersonaDto(
    Guid PersonaId,
    string Nombre,
    List<EquipoResumenDto> Equipos,
    decimal DisponibilidadSemanalHoras,
    // Tareas abiertas sin ninguna fecha (no se pueden situar en una semana) y tareas vencidas
    // sin cerrar (su estimación ya cayó en semanas pasadas), con su estimación.
    decimal HorasSinPlanificar,
    decimal HorasAtrasadas,
    List<CapacidadTareaDto> TareasSinPlanificar,
    List<CapacidadTareaDto> TareasAtrasadas,
    List<CapacidadSemanaDto> Semanas
);

public record CapacidadSemanaDto(
    DateOnly Lunes,
    decimal CapacidadHoras,
    decimal CargaHoras,
    int DiasAusencia,
    List<string> Ausencias,
    List<CapacidadTareaDto> Tareas
);

public record CapacidadTareaDto(Guid TareaId, string Titulo, string ProyectoCodigo, decimal Horas, bool Vencida);

// Ausencia (vacaciones o festivo) de una persona que se solapa con un rango de fechas.
public record AusenciaDto(string Tipo, string Detalle, DateOnly FechaInicio, DateOnly FechaFin);
