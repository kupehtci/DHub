using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Equipo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public Guid? LiderTecnicoId { get; set; }
    public Persona? LiderTecnico { get; set; }
    public string? Descripcion { get; set; }
    public EstadoEquipo Estado { get; set; } = EstadoEquipo.Activo;

    public ICollection<Persona> Miembros { get; set; } = new List<Persona>();
    public ICollection<Proyecto> Proyectos { get; set; } = new List<Proyecto>();
}
