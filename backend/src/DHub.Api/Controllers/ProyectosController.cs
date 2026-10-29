using System.Text;
using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Domain.Enums;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/proyectos")]
public class ProyectosController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProyectosController(AppDbContext db) => _db = db;

    private IQueryable<Proyecto> BaseQuery() => _db.Proyectos
        .Include(p => p.Responsable)
        .Include(p => p.Equipo)
        .Include(p => p.Tareas)
        .Include(p => p.Riesgos);

    [HttpGet]
    public async Task<ActionResult<List<ProyectoDto>>> Listar(
        [FromQuery] EstadoProyecto? estado, [FromQuery] Guid? equipoId, [FromQuery] Guid? responsableId,
        [FromQuery] Prioridad? prioridad, [FromQuery] string? q)
    {
        var query = BaseQuery();
        if (estado.HasValue) query = query.Where(p => p.Estado == estado);
        if (equipoId.HasValue) query = query.Where(p => p.EquipoId == equipoId);
        if (responsableId.HasValue) query = query.Where(p => p.ResponsableId == responsableId);
        if (prioridad.HasValue) query = query.Where(p => p.Prioridad == prioridad);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(p => p.Nombre.Contains(q) || p.Codigo.Contains(q) || p.SistemaInformacion.Contains(q) || p.ClienteArea.Contains(q));

        var proyectos = await query.OrderBy(p => p.Nombre).ToListAsync();
        return proyectos.Select(p => p.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProyectoDetalleDto>> Obtener(Guid id)
    {
        var p = await _db.Proyectos
            .Include(p => p.Responsable)
            .Include(p => p.Equipo)
            .Include(p => p.Hitos)
            .Include(p => p.Tareas).ThenInclude(t => t.Responsable)
            .Include(p => p.Riesgos).ThenInclude(r => r.Responsable)
            .Include(p => p.Notas).ThenInclude(n => n.Autor)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (p is null) return NotFound();

        return new ProyectoDetalleDto(
            p.Id, p.Nombre, p.Codigo, p.SistemaInformacion, p.ClienteArea,
            p.ResponsableId, p.Responsable?.Nombre, p.EquipoId, p.Equipo?.Nombre,
            p.Estado, p.FechaInicio, p.FechaFin, p.Prioridad,
            p.JiraClaveProyecto, p.JiraProyectoUrl,
            p.Hitos.OrderBy(h => h.Fecha).Select(h => h.ToDto()).ToList(),
            p.Tareas.OrderBy(t => t.Estado).Select(t => t.ToDto()).ToList(),
            p.Riesgos.OrderByDescending(r => r.Impacto).Select(r => r.ToDto()).ToList(),
            p.Notas.OrderByDescending(n => n.Fecha).Select(n => n.ToDto()).ToList()
        );
    }

    [HttpPost]
    public async Task<ActionResult<ProyectoDto>> Crear(ProyectoCreateDto dto)
    {
        var proyecto = new Proyecto
        {
            Nombre = dto.Nombre,
            Codigo = dto.Codigo,
            SistemaInformacion = dto.SistemaInformacion,
            ClienteArea = dto.ClienteArea,
            ResponsableId = dto.ResponsableId,
            EquipoId = dto.EquipoId,
            Estado = dto.Estado,
            FechaInicio = dto.FechaInicio,
            FechaFin = dto.FechaFin,
            Prioridad = dto.Prioridad,
            JiraClaveProyecto = dto.JiraClaveProyecto,
            JiraProyectoUrl = dto.JiraProyectoUrl,
        };
        _db.Proyectos.Add(proyecto);
        await _db.SaveChangesAsync();
        await _db.Entry(proyecto).Reference(p => p.Responsable).LoadAsync();
        await _db.Entry(proyecto).Reference(p => p.Equipo).LoadAsync();
        return CreatedAtAction(nameof(Obtener), new { id = proyecto.Id }, proyecto.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, ProyectoUpdateDto dto)
    {
        var proyecto = await _db.Proyectos.FindAsync(id);
        if (proyecto is null) return NotFound();

        proyecto.Nombre = dto.Nombre;
        proyecto.Codigo = dto.Codigo;
        proyecto.SistemaInformacion = dto.SistemaInformacion;
        proyecto.ClienteArea = dto.ClienteArea;
        proyecto.ResponsableId = dto.ResponsableId;
        proyecto.EquipoId = dto.EquipoId;
        proyecto.Estado = dto.Estado;
        proyecto.FechaInicio = dto.FechaInicio;
        proyecto.FechaFin = dto.FechaFin;
        proyecto.Prioridad = dto.Prioridad;
        proyecto.JiraClaveProyecto = dto.JiraClaveProyecto;
        proyecto.JiraProyectoUrl = dto.JiraProyectoUrl;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var proyecto = await _db.Proyectos.FindAsync(id);
        if (proyecto is null) return NotFound();
        _db.Proyectos.Remove(proyecto);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("export")]
    public async Task<IActionResult> Exportar()
    {
        var proyectos = (await BaseQuery().OrderBy(p => p.Nombre).ToListAsync()).Select(p => p.ToDto()).ToList();
        var sb = new StringBuilder();
        sb.AppendLine("Codigo;Nombre;Sistema;ClienteArea;Responsable;Equipo;Estado;Prioridad;FechaInicio;FechaFin;TareasTotal;TareasVencidas;TareasBloqueadas;RiesgosAltos");
        foreach (var p in proyectos)
        {
            sb.AppendLine($"{p.Codigo};{p.Nombre};{p.SistemaInformacion};{p.ClienteArea};{p.ResponsableNombre};{p.EquipoNombre};{p.Estado};{p.Prioridad};{p.FechaInicio};{p.FechaFin};{p.TareasTotal};{p.TareasVencidas};{p.TareasBloqueadas};{p.RiesgosAltos}");
        }
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "proyectos.csv");
    }

    [HttpPost("{proyectoId:guid}/hitos")]
    public async Task<ActionResult<HitoDto>> CrearHito(Guid proyectoId, HitoCreateDto dto)
    {
        var existe = await _db.Proyectos.AnyAsync(p => p.Id == proyectoId);
        if (!existe) return NotFound("Proyecto no encontrado.");

        var hito = new Hito { ProyectoId = proyectoId, Nombre = dto.Nombre, Fecha = dto.Fecha, Estado = dto.Estado, Descripcion = dto.Descripcion };
        _db.Hitos.Add(hito);
        await _db.SaveChangesAsync();
        return hito.ToDto();
    }
}
