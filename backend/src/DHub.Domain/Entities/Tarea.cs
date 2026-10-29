using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Tarea
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Titulo { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public TipoTarea Tipo { get; set; } = TipoTarea.Tarea;
    public EstadoTarea Estado { get; set; } = EstadoTarea.Backlog;
    public Prioridad Prioridad { get; set; } = Prioridad.Media;

    public Guid ProyectoId { get; set; }
    public Proyecto? Proyecto { get; set; }

    public Guid? ResponsableId { get; set; }
    public Persona? Responsable { get; set; }

    public decimal EstimacionHoras { get; set; }
    public DateOnly? FechaInicio { get; set; }
    public DateOnly? FechaObjetivo { get; set; }
    public DateOnly? FechaCierre { get; set; }

    // Bloqueo: obligatorio motivo, responsable y fecha de revisión cuando Estado == Bloqueada
    public string? MotivoBloqueo { get; set; }
    public Guid? ResponsableBloqueoId { get; set; }
    public Persona? ResponsableBloqueo { get; set; }
    public DateOnly? FechaRevisionBloqueo { get; set; }

    // Enlace manual a un ticket de Jira (p. ej. "SIGEX-123").
    public string? JiraTicketClave { get; set; }
    public string? JiraTicketUrl { get; set; }

    public ICollection<Nota> Notas { get; set; } = new List<Nota>();
    public ICollection<Riesgo> Riesgos { get; set; } = new List<Riesgo>();

    public bool EstaVencida => FechaObjetivo.HasValue
        && FechaObjetivo.Value < DateOnly.FromDateTime(DateTime.UtcNow)
        && Estado != EstadoTarea.Hecha
        && Estado != EstadoTarea.Cancelada;
}
