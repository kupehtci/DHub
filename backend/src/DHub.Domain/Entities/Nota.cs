using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Nota
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public Guid AutorId { get; set; }
    public Persona? Autor { get; set; }
    public TipoNota Tipo { get; set; } = TipoNota.Seguimiento;
    public string Texto { get; set; } = string.Empty;

    public Guid? ProyectoId { get; set; }
    public Proyecto? Proyecto { get; set; }
    public Guid? TareaId { get; set; }
    public Tarea? Tarea { get; set; }
    public Guid? PersonaId { get; set; }
    public Persona? Persona { get; set; }
}
