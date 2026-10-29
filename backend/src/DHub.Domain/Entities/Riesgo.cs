using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Riesgo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ProyectoId { get; set; }
    public Proyecto? Proyecto { get; set; }
    public Guid? TareaId { get; set; }
    public Tarea? Tarea { get; set; }

    public string Titulo { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public ImpactoRiesgo Impacto { get; set; } = ImpactoRiesgo.Medio;
    public ProbabilidadRiesgo Probabilidad { get; set; } = ProbabilidadRiesgo.Media;
    public Guid? ResponsableId { get; set; }
    public Persona? Responsable { get; set; }
    public EstadoRiesgo Estado { get; set; } = EstadoRiesgo.Identificado;
    public DateOnly FechaDeteccion { get; set; }
    public DateOnly? FechaRevision { get; set; }
}
