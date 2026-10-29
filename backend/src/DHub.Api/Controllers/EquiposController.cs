using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Domain.Enums;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/equipos")]
public class EquiposController : ControllerBase
{
    private readonly AppDbContext _db;
    public EquiposController(AppDbContext db) => _db = db;

    private IQueryable<Equipo> BaseQuery() => _db.Equipos
        .Include(e => e.LiderTecnico)
        .Include(e => e.Miembros)
        .Include(e => e.Proyectos);

    [HttpGet]
    public async Task<ActionResult<List<EquipoDto>>> Listar([FromQuery] EstadoEquipo? estado)
    {
        var query = BaseQuery();
        if (estado.HasValue) query = query.Where(e => e.Estado == estado);
        var equipos = await query.OrderBy(e => e.Nombre).ToListAsync();
        return equipos.Select(e => e.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EquipoDetalleDto>> Obtener(Guid id)
    {
        var e = await BaseQuery()
            .Include(e => e.Miembros).ThenInclude(m => m.TareasAsignadas)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (e is null) return NotFound();

        return new EquipoDetalleDto(
            e.Id, e.Nombre, e.LiderTecnicoId, e.LiderTecnico?.Nombre, e.Descripcion, e.Estado,
            e.Miembros.OrderBy(m => m.Nombre).Select(m => m.ToDto()).ToList(),
            e.Proyectos.OrderBy(p => p.Nombre).Select(p => p.ToDto()).ToList()
        );
    }

    [HttpPost]
    public async Task<ActionResult<EquipoDto>> Crear(EquipoCreateDto dto)
    {
        var equipo = new Equipo
        {
            Nombre = dto.Nombre,
            LiderTecnicoId = dto.LiderTecnicoId,
            Descripcion = dto.Descripcion,
            Estado = dto.Estado,
        };
        _db.Equipos.Add(equipo);
        await _db.SaveChangesAsync();
        await _db.Entry(equipo).Reference(e => e.LiderTecnico).LoadAsync();
        return CreatedAtAction(nameof(Obtener), new { id = equipo.Id }, equipo.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, EquipoUpdateDto dto)
    {
        var equipo = await _db.Equipos.FindAsync(id);
        if (equipo is null) return NotFound();

        equipo.Nombre = dto.Nombre;
        equipo.LiderTecnicoId = dto.LiderTecnicoId;
        equipo.Descripcion = dto.Descripcion;
        equipo.Estado = dto.Estado;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var equipo = await _db.Equipos.FindAsync(id);
        if (equipo is null) return NotFound();
        _db.Equipos.Remove(equipo);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/miembros/{personaId:guid}")]
    public async Task<IActionResult> AgregarMiembro(Guid id, Guid personaId)
    {
        var equipo = await _db.Equipos.Include(e => e.Miembros).FirstOrDefaultAsync(e => e.Id == id);
        if (equipo is null) return NotFound("Equipo no encontrado.");
        var persona = await _db.Personas.FindAsync(personaId);
        if (persona is null) return NotFound("Persona no encontrada.");

        if (equipo.Miembros.All(m => m.Id != personaId))
        {
            equipo.Miembros.Add(persona);
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{id:guid}/miembros/{personaId:guid}")]
    public async Task<IActionResult> QuitarMiembro(Guid id, Guid personaId)
    {
        var equipo = await _db.Equipos.Include(e => e.Miembros).FirstOrDefaultAsync(e => e.Id == id);
        if (equipo is null) return NotFound("Equipo no encontrado.");
        var persona = equipo.Miembros.FirstOrDefault(m => m.Id == personaId);
        if (persona is null) return NotFound("La persona no pertenece a este equipo.");

        equipo.Miembros.Remove(persona);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Vista "kanban por usuario": una columna por cada persona del equipo, con sus tareas activas.
    [HttpGet("{id:guid}/tablero-usuarios")]
    public async Task<ActionResult<List<TableroPorPersonaDto>>> TableroPorUsuario(Guid id, [FromQuery] bool incluirSinResponsable = true)
    {
        var equipo = await _db.Equipos
            .Include(e => e.Miembros)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (equipo is null) return NotFound();

        var miembroIds = equipo.Miembros.Select(m => m.Id).ToList();

        var tareas = await _db.Tareas
            .Include(t => t.Proyecto).ThenInclude(p => p!.Equipo)
            .Include(t => t.Responsable)
            .Where(t => (t.ResponsableId.HasValue && miembroIds.Contains(t.ResponsableId.Value)) || t.Proyecto!.EquipoId == id)
            .Where(t => t.Estado != EstadoTarea.Cancelada)
            .ToListAsync();

        var resultado = equipo.Miembros.OrderBy(m => m.Nombre).Select(m =>
        {
            var tareasPersona = tareas.Where(t => t.ResponsableId == m.Id).OrderBy(t => t.FechaObjetivo).ToList();
            return new TableroPorPersonaDto(m.Id, m.Nombre, tareasPersona.Where(t => t.EsActiva()).Sum(t => t.EstimacionHoras),
                tareasPersona.Select(t => t.ToDto()).ToList());
        }).ToList();

        if (incluirSinResponsable)
        {
            var sinResponsable = tareas.Where(t => t.ResponsableId == null).OrderBy(t => t.FechaObjetivo).ToList();
            resultado.Add(new TableroPorPersonaDto(null, "Sin responsable", 0, sinResponsable.Select(t => t.ToDto()).ToList()));
        }

        return resultado;
    }

    // Kanban clásico del equipo: tareas de los proyectos/miembros del equipo agrupadas por estado (columnas en el frontend).
    [HttpGet("{id:guid}/tablero")]
    public async Task<ActionResult<List<TareaDto>>> Tablero(Guid id)
    {
        var equipo = await _db.Equipos.Include(e => e.Miembros).FirstOrDefaultAsync(e => e.Id == id);
        if (equipo is null) return NotFound();
        var miembroIds = equipo.Miembros.Select(m => m.Id).ToList();

        var tareas = await _db.Tareas
            .Include(t => t.Proyecto)
            .Include(t => t.Responsable)
            .Where(t => (t.ResponsableId.HasValue && miembroIds.Contains(t.ResponsableId.Value)) || t.Proyecto!.EquipoId == id)
            .OrderBy(t => t.Prioridad)
            .ToListAsync();

        return tareas.Select(t => t.ToDto()).ToList();
    }
}
