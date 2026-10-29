namespace DHub.Api.Dtos;

public record LoginRequestDto(string Usuario, string Password);

public record LoginResponseDto(string Token, string Nombre, string Usuario);

public record CuentaDto(
    Guid Id,
    string NombreUsuario,
    string NombreCompleto,
    string? Email,
    DateTime FechaCreacion,
    DateTime? FechaActualizacion
);

public record ActualizarPerfilDto(string NombreUsuario, string NombreCompleto, string? Email);

public record CambiarPasswordDto(string PasswordActual, string PasswordNueva);
