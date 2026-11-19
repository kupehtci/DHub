using DHub.Api.Dtos;
using DHub.Domain.Enums;
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

    // Tiempo en cada estado y episodios de bloqueo, reconstruidos a partir del historial de
    // cambios de las tareas. Solo cuenta el tiempo dentro del periodo [desde, hasta].
    [HttpGet("tiempos-estado")]
    public async Task<ActionResult<TiemposEstadoDto>> TiemposEstado(
        [FromQuery] Guid? equipoId, [FromQuery] Guid? proyectoId, [FromQuery] Guid? personaId,
        [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta)
    {
        var ahora = DateTime.UtcNow;
        var inicio = desde?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) ?? DateTime.MinValue;
        var fin = hasta?.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) ?? ahora;
        if (fin > ahora) fin = ahora;

        var tareas = _db.Tareas.AsNoTracking().AsQueryable();
        if (equipoId.HasValue) tareas = tareas.Where(t => t.Proyecto!.EquipoId == equipoId);
        if (proyectoId.HasValue) tareas = tareas.Where(t => t.ProyectoId == proyectoId);
        if (personaId.HasValue) tareas = tareas.Where(t => t.ResponsableId == personaId);
        var ids = tareas.Select(t => t.Id);

        var cambios = await _db.TareasHistorial.AsNoTracking()
            .Where(c => ids.Contains(c.TareaId) && (c.Campo == "Creada" || c.Campo == "HistorialIniciado" || c.Campo == "Estado"))
            .OrderBy(c => c.Fecha)
            .Select(c => new { c.TareaId, c.Fecha, c.ValorNuevo })
            .ToListAsync();

        var dias = new Dictionary<EstadoTarea, double>();
        var tareasPorEstado = new Dictionary<EstadoTarea, HashSet<Guid>>();
        var duracionesBloqueo = new List<double>();
        var bloqueosAbiertos = 0;

        foreach (var grupo in cambios.GroupBy(c => c.TareaId))
        {
            var lista = grupo.ToList();
            for (var k = 0; k < lista.Count; k++)
            {
                if (!Enum.TryParse<EstadoTarea>(lista[k].ValorNuevo, out var estado)) continue;
                var desdeSeg = lista[k].Fecha;
                var hastaSeg = k + 1 < lista.Count ? lista[k + 1].Fecha : ahora;

                // Episodios de bloqueo completos (no recortados), si terminan dentro del periodo.
                if (estado == EstadoTarea.Bloqueada)
                {
                    if (k + 1 == lista.Count) bloqueosAbiertos++;
                    else if (hastaSeg >= inicio && hastaSeg <= fin) duracionesBloqueo.Add((hastaSeg - desdeSeg).TotalDays);
                }

                var a = desdeSeg < inicio ? inicio : desdeSeg;
                var b = hastaSeg > fin ? fin : hastaSeg;
                if (b <= a) continue;
                dias[estado] = dias.GetValueOrDefault(estado) + (b - a).TotalDays;
                if (!tareasPorEstado.TryGetValue(estado, out var set)) tareasPorEstado[estado] = set = new();
                set.Add(grupo.Key);
            }
        }

        var estados = Enum.GetValues<EstadoTarea>()
            .Where(dias.ContainsKey)
            .Select(e => new TiempoEstadoDto(e, Math.Round(dias[e], 1), tareasPorEstado[e].Count,
                Math.Round(dias[e] / tareasPorEstado[e].Count, 1)))
            .ToList();

        var historialDesde = await _db.TareasHistorial.MinAsync(c => (DateTime?)c.Fecha);
        return new TiemposEstadoDto(
            estados,
            duracionesBloqueo.Count,
            bloqueosAbiertos,
            duracionesBloqueo.Count > 0 ? Math.Round(duracionesBloqueo.Average(), 1) : null,
            historialDesde);
    }
}
