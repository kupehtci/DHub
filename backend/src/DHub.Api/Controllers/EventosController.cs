using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/eventos")]
public class EventosController : ControllerBase
{
    private readonly AppDbContext _db;
    public EventosController(AppDbContext db) => _db = db;

    private IQueryable<Evento> BaseQuery() => _db.Eventos
        .Include(e => e.Proyecto)
        .Include(e => e.Equipo)
        .Include(e => e.Persona);

    [HttpGet]
    public async Task<ActionResult<List<EventoDto>>> Listar(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta,
        [FromQuery] Guid? proyectoId, [FromQuery] Guid? equipoId, [FromQuery] Guid? personaId)
    {
        var query = BaseQuery();
        if (desde.HasValue) query = query.Where(e => e.FechaFin == null ? e.FechaInicio >= desde : e.FechaFin >= desde);
        if (hasta.HasValue) query = query.Where(e => e.FechaInicio <= hasta);
        if (proyectoId.HasValue) query = query.Where(e => e.ProyectoId == proyectoId);
        if (equipoId.HasValue) query = query.Where(e => e.EquipoId == equipoId);
        if (personaId.HasValue) query = query.Where(e => e.PersonaId == personaId);

        var eventos = await query.OrderBy(e => e.FechaInicio).ToListAsync();
        return eventos.Select(e => e.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EventoDto>> Obtener(Guid id)
    {
        var evento = await BaseQuery().FirstOrDefaultAsync(e => e.Id == id);
        if (evento is null) return NotFound();
        return evento.ToDto();
    }

    [HttpPost]
    public async Task<ActionResult<EventoDto>> Crear(EventoCreateDto dto)
    {
        var evento = new Evento
        {
            Titulo = dto.Titulo,
            Descripcion = dto.Descripcion,
            Tipo = dto.Tipo,
            FechaInicio = dto.FechaInicio,
            FechaFin = dto.FechaFin,
            ProyectoId = dto.ProyectoId,
            EquipoId = dto.EquipoId,
            PersonaId = dto.PersonaId,
        };
        _db.Eventos.Add(evento);
        await _db.SaveChangesAsync();
        var creado = await BaseQuery().FirstAsync(e => e.Id == evento.Id);
        return CreatedAtAction(nameof(Obtener), new { id = evento.Id }, creado.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, EventoUpdateDto dto)
    {
        var evento = await _db.Eventos.FindAsync(id);
        if (evento is null) return NotFound();

        evento.Titulo = dto.Titulo;
        evento.Descripcion = dto.Descripcion;
        evento.Tipo = dto.Tipo;
        evento.FechaInicio = dto.FechaInicio;
        evento.FechaFin = dto.FechaFin;
        evento.ProyectoId = dto.ProyectoId;
        evento.EquipoId = dto.EquipoId;
        evento.PersonaId = dto.PersonaId;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var evento = await _db.Eventos.FindAsync(id);
        if (evento is null) return NotFound();
        _db.Eventos.Remove(evento);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
