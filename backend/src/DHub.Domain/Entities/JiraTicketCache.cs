namespace DHub.Domain.Entities;

// Copia ligera del último estado conocido de un ticket de Jira, para poder mostrar
// una etiqueta de estado "en vivo" en toda la aplicación sin llamar a la API de Jira
// en cada render. Se refresca sola cuando pasa el TTL (ver JiraClient).
public class JiraTicketCache
{
    public string Clave { get; set; } = string.Empty;
    public string Resumen { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string? AsignadoNombre { get; set; }
    public DateTime? ActualizadoJira { get; set; }
    public string Url { get; set; } = string.Empty;
    public DateTime UltimaConsulta { get; set; }
    // true si el último intento de refrescarla desde Jira falló: se sigue mostrando
    // el último valor bueno conocido, pero marcado como no confirmado.
    public bool Error { get; set; }
}
