namespace DHub.Domain.Entities;

// Cuenta del único coordinador técnico que usa la aplicación (login simple,
// preparado para sustituirse por Microsoft Entra ID más adelante).
public class CuentaUsuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NombreUsuario { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaActualizacion { get; set; }
}
