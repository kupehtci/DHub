using DHub.Api.Dtos;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

// Datos agregados para la página de Analíticas que no exponen los listados existentes.
[ApiController]
[Route("api/analiticas")]
public class AnaliticasController : ControllerBase
{
    private readonly AppDbContext _db;
    public AnaliticasController(AppDbContext db) => _db = db;

    // Hitos de todos los proyectos, filtrables por equipo, proyecto, persona y rango de fechas.
    // El filtro de persona incluye los proyectos de los que es responsable o en los que tiene tareas asignadas.
    [HttpGet("hitos")]
    public async Task<ActionResult<List<HitoAnaliticaDto>>> Hitos(
        [FromQuery] Guid? equipoId, [FromQuery] Guid? proyectoId, [FromQuery] Guid? personaId,
        [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta)
    {
        var query = _db.Hitos.AsNoTracking().Where(h => h.Proyecto != null);
        if (equipoId.HasValue) query = query.Where(h => h.Proyecto!.EquipoId == equipoId);
        if (proyectoId.HasValue) query = query.Where(h => h.ProyectoId == proyectoId);
        if (personaId.HasValue)
            query = query.Where(h => h.Proyecto!.ResponsableId == personaId
                || h.Proyecto.Tareas.Any(t => t.ResponsableId == personaId));
        if (desde.HasValue) query = query.Where(h => h.Fecha >= desde);
        if (hasta.HasValue) query = query.Where(h => h.Fecha <= hasta);

        return await query
            .OrderBy(h => h.Fecha)
            .Select(h => new HitoAnaliticaDto(
                h.Id, h.ProyectoId, h.Proyecto!.Codigo, h.Proyecto.Nombre, h.Proyecto.EquipoId,
                h.Nombre, h.Fecha, h.Estado))
            .ToListAsync();
    }
}
