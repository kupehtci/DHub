using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/festivos")]
public class FestivosController : ControllerBase
{
    private readonly AppDbContext _db;
    public FestivosController(AppDbContext db) => _db = db;

    private IQueryable<Festivo> BaseQuery() => _db.Festivos.Include(f => f.Personas);

    [HttpGet]
    public async Task<ActionResult<List<FestivoDto>>> Listar(
        [FromQuery] Guid? personaId, [FromQuery] Guid? equipoId,
        [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta)
    {
        var query = BaseQuery();
        if (personaId.HasValue) query = query.Where(f => f.Personas.Any(p => p.Id == personaId));
        if (equipoId.HasValue) query = query.Where(f => f.Personas.Any(p => p.Equipos.Any(e => e.Id == equipoId)));
        if (desde.HasValue) query = query.Where(f => f.FechaFin >= desde);
        if (hasta.HasValue) query = query.Where(f => f.FechaInicio <= hasta);

        var festivos = await query.OrderBy(f => f.FechaInicio).ToListAsync();
        return festivos.Select(f => f.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FestivoDto>> Obtener(Guid id)
    {
        var festivo = await BaseQuery().FirstOrDefaultAsync(f => f.Id == id);
        if (festivo is null) return NotFound();
        return festivo.ToDto();
    }

    private async Task<(List<Persona>? personas, string? error)> ValidarAsync(FestivoSaveDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre)) return (null, "Indica el nombre del festivo.");
        if (dto.FechaFin < dto.FechaInicio) return (null, "La fecha de fin no puede ser anterior a la fecha de inicio.");
        var ids = dto.PersonaIds.Distinct().ToList();
        if (ids.Count == 0) return (null, "Selecciona al menos una persona a la que afecte el festivo.");
        var personas = await _db.Personas.Where(p => ids.Contains(p.Id)).ToListAsync();
        if (personas.Count != ids.Count) return (null, "Alguna de las personas indicadas no existe.");
        return (personas, null);
    }

    [HttpPost]
    public async Task<ActionResult<FestivoDto>> Crear(FestivoSaveDto dto)
    {
        var (personas, error) = await ValidarAsync(dto);
        if (error is not null) return BadRequest(error);

        var festivo = new Festivo
        {
            Nombre = dto.Nombre.Trim(),
            Ambito = dto.Ambito,
            FechaInicio = dto.FechaInicio,
            FechaFin = dto.FechaFin,
            Comentario = dto.Comentario,
            Personas = personas!,
        };
        _db.Festivos.Add(festivo);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Obtener), new { id = festivo.Id }, festivo.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, FestivoSaveDto dto)
    {
        var festivo = await BaseQuery().FirstOrDefaultAsync(f => f.Id == id);
        if (festivo is null) return NotFound();

        var (personas, error) = await ValidarAsync(dto);
        if (error is not null) return BadRequest(error);

        festivo.Nombre = dto.Nombre.Trim();
        festivo.Ambito = dto.Ambito;
        festivo.FechaInicio = dto.FechaInicio;
        festivo.FechaFin = dto.FechaFin;
        festivo.Comentario = dto.Comentario;
        festivo.Personas.Clear();
        foreach (var p in personas!) festivo.Personas.Add(p);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var festivo = await _db.Festivos.FindAsync(id);
        if (festivo is null) return NotFound();
        _db.Festivos.Remove(festivo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
