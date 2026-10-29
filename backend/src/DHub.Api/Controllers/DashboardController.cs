using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Enums;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Obtener([FromQuery] Guid? equipoId, [FromQuery] Guid? proyectoId)
    {
        var proyectosQuery = _db.Proyectos
            .Include(p => p.Responsable).Include(p => p.Equipo).Include(p => p.Tareas).Include(p => p.Riesgos)
            .AsQueryable();
        if (equipoId.HasValue) proyectosQuery = proyectosQuery.Where(p => p.EquipoId == equipoId);
        if (proyectoId.HasValue) proyectosQuery = proyectosQuery.Where(p => p.Id == proyectoId);
        var proyectos = await proyectosQuery.ToListAsync();
        var proyectoIds = proyectos.Select(p => p.Id).ToList();

        var tareasQuery = _db.Tareas
            .Include(t => t.Proyecto).ThenInclude(p => p!.Equipo)
            .Include(t => t.Responsable)
            .Where(t => proyectoIds.Contains(t.ProyectoId));
        var tareas = await tareasQuery.ToListAsync();

        var riesgosQuery = _db.Riesgos
            .Include(r => r.Proyecto).Include(r => r.Tarea).Include(r => r.Responsable)
            .Where(r => r.ProyectoId == null || proyectoIds.Contains(r.ProyectoId.Value));
        var riesgos = await riesgosQuery.ToListAsync();

        var tareasVencidas = tareas.Where(t => t.EsVencida()).OrderBy(t => t.FechaObjetivo).ToList();
        var tareasBloqueadas = tareas.Where(t => t.Estado == EstadoTarea.Bloqueada).OrderBy(t => t.FechaRevisionBloqueo).ToList();
        var tareasSinResponsable = tareas.Where(t => t.ResponsableId == null && t.Estado != EstadoTarea.Hecha && t.Estado != EstadoTarea.Cancelada).ToList();
        var riesgosAltos = riesgos.Where(r => r.Impacto is ImpactoRiesgo.Alto or ImpactoRiesgo.Critico
            && r.Estado != EstadoRiesgo.Cerrado && r.Estado != EstadoRiesgo.Mitigado).OrderByDescending(r => r.Impacto).ToList();

        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var proximosHitos = await _db.Hitos
            .Where(h => proyectoIds.Contains(h.ProyectoId) && h.Estado != EstadoHito.Completado && h.Fecha <= hoy.AddDays(30))
            .OrderBy(h => h.Fecha)
            .ToListAsync();

        var dto = new DashboardDto(
            proyectos.Count(p => p.Estado == EstadoProyecto.EnCurso),
            proyectos.Count(p => (p.Riesgos.Any(r => r.Impacto is ImpactoRiesgo.Alto or ImpactoRiesgo.Critico && r.Estado != EstadoRiesgo.Cerrado))
                || p.Tareas.Any(t => t.EsVencida())),
            tareasVencidas.Count,
            tareasBloqueadas.Count,
            tareasSinResponsable.Count,
            riesgosAltos.Count,
            proyectos.OrderBy(p => p.Nombre).Select(p => p.ToDto()).ToList(),
            tareasVencidas.Select(t => t.ToDto()).ToList(),
            tareasBloqueadas.Select(t => t.ToDto()).ToList(),
            tareasSinResponsable.Select(t => t.ToDto()).ToList(),
            riesgosAltos.Select(r => r.ToDto()).ToList(),
            proximosHitos.Select(h => h.ToDto()).ToList()
        );
        return dto;
    }
}
