using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Proyecto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public string SistemaInformacion { get; set; } = string.Empty;
    public string ClienteArea { get; set; } = string.Empty;
    public Guid? ResponsableId { get; set; }
    public Persona? Responsable { get; set; }
    public Guid? EquipoId { get; set; }
    public Equipo? Equipo { get; set; }
    public EstadoProyecto Estado { get; set; } = EstadoProyecto.Planificado;
    public DateOnly FechaInicio { get; set; }
    public DateOnly? FechaFin { get; set; }
    public Prioridad Prioridad { get; set; } = Prioridad.Media;
    // Enlace manual al proyecto/tablero de Jira (p. ej. "https://ministerio-tic.atlassian.net/jira/software/projects/SIGEX/boards/1").
    public string? JiraProyectoUrl { get; set; }
    public string? JiraClaveProyecto { get; set; }

    public ICollection<Tarea> Tareas { get; set; } = new List<Tarea>();
    public ICollection<Hito> Hitos { get; set; } = new List<Hito>();
    public ICollection<Riesgo> Riesgos { get; set; } = new List<Riesgo>();
    public ICollection<Nota> Notas { get; set; } = new List<Nota>();
    public ICollection<Evento> Eventos { get; set; } = new List<Evento>();
}
