namespace DHub.Domain.Entities;

public class Vacacion
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PersonaId { get; set; }
    public Persona? Persona { get; set; }

    public DateOnly FechaInicio { get; set; }
    public DateOnly FechaFin { get; set; }
    public string? Comentario { get; set; }
}
