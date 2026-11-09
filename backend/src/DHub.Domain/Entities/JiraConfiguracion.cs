namespace DHub.Domain.Entities;

// Fila única con los datos de conexión a Jira Cloud, editable desde Configuración > Mi cuenta.
// El ApiToken se guarda en claro (como la contraseña de la base de datos en docker-compose):
// hace falta en texto reversible para poder llamar a la API de Jira, nunca se hashea.
public class JiraConfiguracion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string BaseUrl { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string ApiToken { get; set; } = string.Empty;
    public DateTime? FechaActualizacion { get; set; }
}
