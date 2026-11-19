using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Infrastructure.Data;
using DHub.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/hitos")]
public class HitosController : ControllerBase
{
    private readonly AppDbContext _db;
    public HitosController(AppDbContext db) => _db = db;

    // Listado global de hitos de todos los proyectos, con filtros.
    [HttpGet]
    public async Task<ActionResult<List<HitoListadoDto>>> Listar(
        [FromQuery] string? q, [FromQuery] Guid? proyectoId, [FromQuery] Guid? equipoId,
        [FromQuery] EstadoHito? estado, [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta)
    {
        var query = _db.Hitos.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var texto = $"%{q.Trim()}%";
            query = query.Where(h => EF.Functions.ILike(h.Nombre, texto)
                || (h.Descripcion != null && EF.Functions.ILike(h.Descripcion, texto)));
        }
        if (proyectoId.HasValue) query = query.Where(h => h.ProyectoId == proyectoId);
        if (equipoId.HasValue) query = query.Where(h => h.Proyecto!.EquipoId == equipoId);
        if (estado.HasValue) query = query.Where(h => h.Estado == estado);
        if (desde.HasValue) query = query.Where(h => h.Fecha >= desde);
        if (hasta.HasValue) query = query.Where(h => h.Fecha <= hasta);

        return await query
            .OrderBy(h => h.Fecha).ThenBy(h => h.Nombre)
            .Select(h => new HitoListadoDto(
                h.Id, h.ProyectoId, h.Proyecto!.Codigo, h.Proyecto.Nombre, h.Proyecto.Estado,
                h.Proyecto.EquipoId, h.Proyecto.Equipo != null ? h.Proyecto.Equipo.Nombre : null,
                h.Proyecto.ResponsableId, h.Proyecto.Responsable != null ? h.Proyecto.Responsable.Nombre : null,
                h.Nombre, h.Fecha, h.Estado, h.Descripcion, h.CreadoEn, h.ActualizadoEn))
            .ToListAsync();
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, HitoUpdateDto dto)
    {
        var hito = await _db.Hitos.FindAsync(id);
        if (hito is null) return NotFound();

        hito.Nombre = dto.Nombre;
        hito.Fecha = dto.Fecha;
        hito.Estado = dto.Estado;
        hito.Descripcion = dto.Descripcion;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var hito = await _db.Hitos.FindAsync(id);
        if (hito is null) return NotFound();
        _db.Hitos.Remove(hito);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
