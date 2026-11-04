using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/vacaciones")]
public class VacacionesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VacacionesController(AppDbContext db) => _db = db;

    private IQueryable<Vacacion> BaseQuery() => _db.Vacaciones.Include(v => v.Persona);

    [HttpGet]
    public async Task<ActionResult<List<VacacionDto>>> Listar(
        [FromQuery] Guid? personaId, [FromQuery] Guid? equipoId,
        [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta)
    {
        var query = BaseQuery();
        if (personaId.HasValue) query = query.Where(v => v.PersonaId == personaId);
        if (equipoId.HasValue) query = query.Where(v => v.Persona!.Equipos.Any(e => e.Id == equipoId));
        // Solapamiento de rango: la vacación es relevante si termina después de "desde" y empieza antes de "hasta".
        if (desde.HasValue) query = query.Where(v => v.FechaFin >= desde);
        if (hasta.HasValue) query = query.Where(v => v.FechaInicio <= hasta);

        var vacaciones = await query.OrderBy(v => v.FechaInicio).ToListAsync();
        return vacaciones.Select(v => v.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VacacionDto>> Obtener(Guid id)
    {
        var vacacion = await BaseQuery().FirstOrDefaultAsync(v => v.Id == id);
        if (vacacion is null) return NotFound();
        return vacacion.ToDto();
    }

    [HttpPost]
    public async Task<ActionResult<VacacionDto>> Crear(VacacionCreateDto dto)
    {
        if (dto.FechaFin < dto.FechaInicio)
            return BadRequest("La fecha de fin no puede ser anterior a la fecha de inicio.");

        var persona = await _db.Personas.FindAsync(dto.PersonaId);
        if (persona is null) return NotFound("Persona no encontrada.");

        var vacacion = new Vacacion
        {
            PersonaId = dto.PersonaId,
            FechaInicio = dto.FechaInicio,
            FechaFin = dto.FechaFin,
            Comentario = dto.Comentario,
        };
        _db.Vacaciones.Add(vacacion);
        await _db.SaveChangesAsync();
        var creada = await BaseQuery().FirstAsync(v => v.Id == vacacion.Id);
        return CreatedAtAction(nameof(Obtener), new { id = vacacion.Id }, creada.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, VacacionUpdateDto dto)
    {
        if (dto.FechaFin < dto.FechaInicio)
            return BadRequest("La fecha de fin no puede ser anterior a la fecha de inicio.");

        var vacacion = await _db.Vacaciones.FindAsync(id);
        if (vacacion is null) return NotFound();

        vacacion.FechaInicio = dto.FechaInicio;
        vacacion.FechaFin = dto.FechaFin;
        vacacion.Comentario = dto.Comentario;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var vacacion = await _db.Vacaciones.FindAsync(id);
        if (vacacion is null) return NotFound();
        _db.Vacaciones.Remove(vacacion);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
