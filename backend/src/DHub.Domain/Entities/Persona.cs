using DHub.Domain.Enums;

namespace DHub.Domain.Entities;

public class Persona
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public decimal DisponibilidadSemanalHoras { get; set; } = 40;
    public EstadoPersona Estado { get; set; } = EstadoPersona.Activo;

    // Una persona puede pertenecer a varios equipos a la vez.
    public ICollection<Equipo> Equipos { get; set; } = new List<Equipo>();

    public ICollection<Tarea> TareasAsignadas { get; set; } = new List<Tarea>();
    public ICollection<Riesgo> RiesgosResponsable { get; set; } = new List<Riesgo>();
    public ICollection<Nota> Notas { get; set; } = new List<Nota>();
}
