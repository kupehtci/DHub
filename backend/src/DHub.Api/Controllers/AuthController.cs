using DHub.Api.Dtos;
using DHub.Domain.Entities;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

// Cuenta del único coordinador técnico que usa la aplicación: login simple
// respaldado en base de datos (contraseña con hash), con perfil editable.
// Preparado para sustituirse por Microsoft Entra ID (OIDC) más adelante.
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher<CuentaUsuario> _hasher = new();

    public AuthController(AppDbContext db) => _db = db;

    private Task<CuentaUsuario?> ObtenerCuentaAsync() => _db.CuentasUsuario.FirstOrDefaultAsync();

    private static CuentaDto ToDto(CuentaUsuario c) =>
        new(c.Id, c.NombreUsuario, c.NombreCompleto, c.Email, c.FechaCreacion, c.FechaActualizacion);

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequestDto dto)
    {
        var cuenta = await _db.CuentasUsuario.FirstOrDefaultAsync(c => c.NombreUsuario == dto.Usuario);
        if (cuenta is null)
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });

        var resultado = _hasher.VerifyHashedPassword(cuenta, cuenta.PasswordHash, dto.Password);
        if (resultado == PasswordVerificationResult.Failed)
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        return Ok(new LoginResponseDto(token, cuenta.NombreCompleto, cuenta.NombreUsuario));
    }

    [HttpGet("me")]
    public async Task<ActionResult<CuentaDto>> Me()
    {
        var cuenta = await ObtenerCuentaAsync();
        if (cuenta is null) return NotFound();
        return ToDto(cuenta);
    }

    [HttpPut("perfil")]
    public async Task<ActionResult<CuentaDto>> ActualizarPerfil(ActualizarPerfilDto dto)
    {
        var cuenta = await ObtenerCuentaAsync();
        if (cuenta is null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.NombreUsuario) || string.IsNullOrWhiteSpace(dto.NombreCompleto))
            return BadRequest(new { mensaje = "El nombre de usuario y el nombre completo son obligatorios." });

        var enUso = await _db.CuentasUsuario.AnyAsync(c => c.Id != cuenta.Id && c.NombreUsuario == dto.NombreUsuario);
        if (enUso)
            return BadRequest(new { mensaje = "Ese nombre de usuario ya está en uso." });

        cuenta.NombreUsuario = dto.NombreUsuario;
        cuenta.NombreCompleto = dto.NombreCompleto;
        cuenta.Email = dto.Email;
        cuenta.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToDto(cuenta);
    }

    [HttpPut("password")]
    public async Task<IActionResult> CambiarPassword(CambiarPasswordDto dto)
    {
        var cuenta = await ObtenerCuentaAsync();
        if (cuenta is null) return NotFound();

        var resultado = _hasher.VerifyHashedPassword(cuenta, cuenta.PasswordHash, dto.PasswordActual);
        if (resultado == PasswordVerificationResult.Failed)
            return BadRequest(new { mensaje = "La contraseña actual no es correcta." });

        if (string.IsNullOrWhiteSpace(dto.PasswordNueva) || dto.PasswordNueva.Length < 6)
            return BadRequest(new { mensaje = "La nueva contraseña debe tener al menos 6 caracteres." });

        cuenta.PasswordHash = _hasher.HashPassword(cuenta, dto.PasswordNueva);
        cuenta.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
