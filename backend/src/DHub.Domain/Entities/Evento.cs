using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Evento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Titulo { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public TipoEvento Tipo { get; set; } = TipoEvento.Reunion;
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }

    public Guid? ProyectoId { get; set; }
    public Proyecto? Proyecto { get; set; }
    public Guid? EquipoId { get; set; }
    public Equipo? Equipo { get; set; }
    public Guid? PersonaId { get; set; }
    public Persona? Persona { get; set; }
}
