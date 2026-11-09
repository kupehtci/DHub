namespace DHub.Domain.Entities;

// Catálogo de espacios/proyectos Jira propios de la organización (p. ej. "SI_GrayLog" -> "DESA0195"),
// usado para elegir la clave de un proyecto desde un desplegable en vez de escribirla a mano.
public class JiraEspacio
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public string Clave { get; set; } = string.Empty;
}
