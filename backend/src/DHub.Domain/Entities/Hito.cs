using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Hito
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProyectoId { get; set; }
    public Proyecto? Proyecto { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public DateOnly Fecha { get; set; }
    public EstadoHito Estado { get; set; } = EstadoHito.Pendiente;
    public string? Descripcion { get; set; }
}
