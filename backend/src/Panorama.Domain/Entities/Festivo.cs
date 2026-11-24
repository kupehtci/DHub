using Panorama.Domain.Enums;

namespace Panorama.Domain.Entities;

// Día (o días) no laborable que afecta a un grupo de personas: festivos nacionales,
// autonómicos o locales. Se guarda a quién afecta porque no todos los festivos aplican
// a toda la plantilla (p. ej. los de una comunidad autónoma concreta).
public class Festivo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public AmbitoFestivo Ambito { get; set; } = AmbitoFestivo.Nacional;
    public DateOnly FechaInicio { get; set; }
    public DateOnly FechaFin { get; set; }
    public string? Comentario { get; set; }

    public ICollection<Persona> Personas { get; set; } = new List<Persona>();
}
