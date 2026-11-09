using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/jira")]
public class JiraController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JiraClient _jira;
    public JiraController(AppDbContext db, JiraClient jira)
    {
        _db = db;
        _jira = jira;
    }

    [HttpGet("espacios")]
    public async Task<ActionResult<List<JiraEspacioDto>>> ListarEspacios()
    {
        var espacios = await _db.JiraEspacios.OrderBy(e => e.Nombre).ToListAsync();
        return espacios.Select(e => new JiraEspacioDto(e.Id, e.Nombre, e.Clave)).ToList();
    }

    [HttpGet("configuracion")]
    public async Task<ActionResult<JiraConfiguracionDto>> ObtenerConfiguracion()
    {
        var cfg = await _jira.ObtenerConfiguracionAsync();
        if (cfg is null) return new JiraConfiguracionDto(false, null, null, null, null);

        return new JiraConfiguracionDto(true, cfg.BaseUrl, cfg.Email, EnmascararToken(cfg.ApiToken), cfg.FechaActualizacion);
    }

    [HttpPut("configuracion")]
    public async Task<ActionResult<JiraConfiguracionDto>> ActualizarConfiguracion(JiraConfiguracionUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.BaseUrl) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { mensaje = "La URL de Jira y el email son obligatorios." });

        var cfg = await _db.JiraConfiguraciones.FirstOrDefaultAsync();
        if (cfg is null)
        {
            if (string.IsNullOrWhiteSpace(dto.ApiToken))
                return BadRequest(new { mensaje = "Indica el API token la primera vez que configures la conexión." });
            cfg = new JiraConfiguracion();
            _db.JiraConfiguraciones.Add(cfg);
        }

        cfg.BaseUrl = dto.BaseUrl.Trim();
        cfg.Email = dto.Email.Trim();
        if (!string.IsNullOrWhiteSpace(dto.ApiToken)) cfg.ApiToken = dto.ApiToken.Trim();
        cfg.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new JiraConfiguracionDto(true, cfg.BaseUrl, cfg.Email, EnmascararToken(cfg.ApiToken), cfg.FechaActualizacion);
    }

    [HttpPost("configuracion/probar")]
    public async Task<ActionResult<JiraProbarConexionResultadoDto>> ProbarConexion(JiraProbarConexionDto dto)
    {
        var (ok, mensaje) = await _jira.ProbarConexionAsync(dto.BaseUrl, dto.Email, dto.ApiToken);
        return new JiraProbarConexionResultadoDto(ok, mensaje);
    }

    [HttpGet("ticket/{clave}")]
    public async Task<ActionResult<JiraTicketInfoDto>> ObtenerTicket(string clave)
    {
        try
        {
            var info = await _jira.ObtenerTicketForzadoAsync(clave);
            return ADto(info);
        }
        catch (JiraNoConfiguradoException)
        {
            return BadRequest(new { mensaje = "Todavía no se ha configurado la conexión con Jira (Configuración > Mi cuenta)." });
        }
        catch (JiraApiException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
    }

    // Etiquetas "en vivo" (con caché) para una tanda de tickets: usado por las tablas,
    // tableros y fichas de proyecto para no tener que pulsar nada por tarea.
    [HttpPost("tickets/lote")]
    public async Task<ActionResult<List<JiraTicketInfoDto>>> ObtenerTicketsLote(JiraTicketsLoteDto dto)
    {
        var tickets = await _jira.ObtenerTicketsConCacheAsync(dto.Claves ?? new List<string>());
        return tickets.Select(ADto).ToList();
    }

    // Todos los tickets (abiertos por defecto) del espacio Jira de un proyecto, en directo.
    [HttpGet("proyectos/{claveProyecto}/tickets")]
    public async Task<ActionResult<List<JiraTicketInfoDto>>> ListarTicketsDeProyecto(string claveProyecto, [FromQuery] bool soloAbiertos = true)
    {
        try
        {
            var tickets = await _jira.BuscarTicketsDeProyectoAsync(claveProyecto, soloAbiertos);
            return tickets.Select(ADto).ToList();
        }
        catch (JiraNoConfiguradoException)
        {
            return BadRequest(new { mensaje = "Todavía no se ha configurado la conexión con Jira (Configuración > Mi cuenta)." });
        }
        catch (JiraApiException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
    }

    private static JiraTicketInfoDto ADto(JiraTicketInfo info) =>
        new(info.Clave, info.Resumen, info.Estado, info.AsignadoNombre, info.Actualizado, info.Url);

    private static string EnmascararToken(string token)
    {
        if (string.IsNullOrEmpty(token)) return string.Empty;
        var visibles = token.Length > 4 ? token[^4..] : token;
        return $"••••••••{visibles}";
    }
}
