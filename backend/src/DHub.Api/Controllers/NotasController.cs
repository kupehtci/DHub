using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Domain.Enums;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/notas")]
public class NotasController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotasController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<NotaDto>>> Listar(
        [FromQuery] Guid? proyectoId, [FromQuery] Guid? tareaId, [FromQuery] Guid? personaId, [FromQuery] TipoNota? tipo)
    {
        var query = _db.Notas
            .Include(n => n.Autor)
            .Include(n => n.Proyecto)
            .Include(n => n.Tarea)
            .Include(n => n.Persona)
            .AsQueryable();

        if (proyectoId.HasValue) query = query.Where(n => n.ProyectoId == proyectoId);
        if (tareaId.HasValue) query = query.Where(n => n.TareaId == tareaId);
        if (personaId.HasValue) query = query.Where(n => n.PersonaId == personaId);
        if (tipo.HasValue) query = query.Where(n => n.Tipo == tipo);

        var notas = await query.OrderByDescending(n => n.Fecha).ToListAsync();
        return notas.Select(n => n.ToDto()).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<NotaDto>> Crear(NotaCreateDto dto)
    {
        var nota = new Nota
        {
            AutorId = dto.AutorId,
            Tipo = dto.Tipo,
            Texto = dto.Texto,
            ProyectoId = dto.ProyectoId,
            TareaId = dto.TareaId,
            PersonaId = dto.PersonaId,
            Fecha = DateTime.UtcNow,
        };
        _db.Notas.Add(nota);
        await _db.SaveChangesAsync();

        var creada = await _db.Notas
            .Include(n => n.Autor).Include(n => n.Proyecto).Include(n => n.Tarea).Include(n => n.Persona)
            .FirstAsync(n => n.Id == nota.Id);
        return creada.ToDto();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var nota = await _db.Notas.FindAsync(id);
        if (nota is null) return NotFound();
        _db.Notas.Remove(nota);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
