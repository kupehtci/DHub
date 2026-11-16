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
    public async Task<ActionResult<DashboardDto>> Obtener([FromQuery] Guid? equipoId, [FromQuery] Guid? proyectoId, [FromQuery] DateOnly? hoy)
    {
        // El cliente envía su fecha local para que "hoy" no dependa de la zona horaria del servidor.
        var fechaHoy = hoy ?? DateOnly.FromDateTime(DateTime.UtcNow);

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

        var proximosHitos = await _db.Hitos
            .Where(h => proyectoIds.Contains(h.ProyectoId) && h.Estado != EstadoHito.Completado && h.Fecha <= fechaHoy.AddDays(30))
            .OrderBy(h => h.Fecha)
            .ToListAsync();

        var proyectosEnRiesgo = proyectos
            .Where(p => p.Riesgos.Any(r => r.Impacto is ImpactoRiesgo.Alto or ImpactoRiesgo.Critico && r.Estado != EstadoRiesgo.Cerrado)
                || p.Tareas.Any(t => t.EsVencida()))
            .Select(p => p.Id)
            .ToList();

        var tareasHoy = tareas
            .Where(t => t.Estado != EstadoTarea.Hecha && t.Estado != EstadoTarea.Cancelada
                && (t.FechaObjetivo == fechaHoy || t.FechaInicio == fechaHoy))
            .OrderBy(t => t.FechaObjetivo == fechaHoy ? 0 : 1).ThenByDescending(t => t.Prioridad)
            .ToList();

        // Ausencias de hoy: personas del equipo filtrado (o todas) de vacaciones o con festivo.
        var personasQuery = _db.Personas.AsQueryable();
        if (equipoId.HasValue) personasQuery = personasQuery.Where(p => p.Equipos.Any(e => e.Id == equipoId));
        var personaIds = await personasQuery.Select(p => p.Id).ToListAsync();
        var vacacionesHoy = await _db.Vacaciones.Include(v => v.Persona)
            .Where(v => personaIds.Contains(v.PersonaId) && v.FechaInicio <= fechaHoy && v.FechaFin >= fechaHoy)
            .ToListAsync();
        var festivosHoy = await _db.Festivos.Include(f => f.Personas)
            .Where(f => f.FechaInicio <= fechaHoy && f.FechaFin >= fechaHoy)
            .ToListAsync();
        var ausencias = vacacionesHoy
            .Select(v => new AusenciaHoyDto(v.PersonaId, v.Persona!.Nombre, "Vacaciones", v.Comentario, v.FechaFin))
            .Concat(festivosHoy.SelectMany(f => f.Personas
                .Where(p => personaIds.Contains(p.Id))
                .Select(p => new AusenciaHoyDto(p.Id, p.Nombre, "Festivo", f.Nombre, f.FechaFin))))
            .OrderBy(a => a.PersonaNombre)
            .ToList();

        var dto = new DashboardDto(
            proyectos.Count(p => p.Estado == EstadoProyecto.EnCurso),
            proyectosEnRiesgo.Count,
            tareasVencidas.Count,
            tareasBloqueadas.Count,
            tareasSinResponsable.Count,
            riesgosAltos.Count,
            proyectos.OrderBy(p => p.Nombre).Select(p => p.ToDto()).ToList(),
            tareasVencidas.Select(t => t.ToDto()).ToList(),
            tareasBloqueadas.Select(t => t.ToDto()).ToList(),
            tareasSinResponsable.Select(t => t.ToDto()).ToList(),
            riesgosAltos.Select(r => r.ToDto()).ToList(),
            proximosHitos.Select(h => h.ToDto()).ToList(),
            proyectosEnRiesgo,
            tareasHoy.Select(t => t.ToDto()).ToList(),
            ausencias
        );
        return dto;
    }
}
