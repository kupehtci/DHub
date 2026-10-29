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
[Route("api/tareas")]
public class TareasController : ControllerBase
{
    private readonly AppDbContext _db;
    public TareasController(AppDbContext db) => _db = db;

    private IQueryable<Tarea> BaseQuery() => _db.Tareas
        .Include(t => t.Proyecto).ThenInclude(p => p!.Equipo)
        .Include(t => t.Responsable)
        .Include(t => t.ResponsableBloqueo);

    // Carga, en una sola consulta, las tareas relacionadas de todas las tareas indicadas.
    private async Task<Dictionary<Guid, List<TareaRelacionadaDto>>> CargarRelacionesAsync(IEnumerable<Guid> tareaIds)
    {
        var ids = tareaIds.ToList();
        var relaciones = await _db.TareasRelacionadas
            .Where(r => ids.Contains(r.TareaOrigenId))
            .Include(r => r.TareaDestino!).ThenInclude(t => t.Proyecto)
            .ToListAsync();

        return relaciones
            .GroupBy(r => r.TareaOrigenId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(r => new TareaRelacionadaDto(
                    r.TareaDestino!.Id, r.TareaDestino.Titulo, r.TareaDestino.Proyecto?.Codigo ?? "",
                    r.TareaDestino.Estado, r.TareaDestino.Prioridad))
                    .OrderBy(t => t.Titulo).ToList());
    }

    [HttpGet]
    public async Task<ActionResult<List<TareaDto>>> Listar(
        [FromQuery] Guid? proyectoId, [FromQuery] Guid? equipoId, [FromQuery] Guid? responsableId,
        [FromQuery] EstadoTarea? estado, [FromQuery] Prioridad? prioridad, [FromQuery] bool? bloqueada,
        [FromQuery] bool? vencida, [FromQuery] bool? sinResponsable, [FromQuery] string? q)
    {
        var query = BaseQuery();
        if (proyectoId.HasValue) query = query.Where(t => t.ProyectoId == proyectoId);
        if (equipoId.HasValue) query = query.Where(t => t.Proyecto!.EquipoId == equipoId);
        if (responsableId.HasValue) query = query.Where(t => t.ResponsableId == responsableId);
        if (estado.HasValue) query = query.Where(t => t.Estado == estado);
        if (prioridad.HasValue) query = query.Where(t => t.Prioridad == prioridad);
        if (bloqueada.HasValue) query = bloqueada.Value ? query.Where(t => t.Estado == EstadoTarea.Bloqueada) : query.Where(t => t.Estado != EstadoTarea.Bloqueada);
        if (sinResponsable == true) query = query.Where(t => t.ResponsableId == null);
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(t => t.Titulo.Contains(q));

        var tareas = await query.OrderBy(t => t.FechaObjetivo).ToListAsync();
        if (vencida.HasValue)
            tareas = tareas.Where(t => t.EsVencida() == vencida.Value).ToList();

        var relaciones = await CargarRelacionesAsync(tareas.Select(t => t.Id));
        return tareas.Select(t => t.ToDto() with { Relacionadas = relaciones.GetValueOrDefault(t.Id, new()) }).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TareaDto>> Obtener(Guid id)
    {
        var tarea = await BaseQuery().FirstOrDefaultAsync(t => t.Id == id);
        if (tarea is null) return NotFound();
        var relaciones = await CargarRelacionesAsync(new[] { id });
        return tarea.ToDto() with { Relacionadas = relaciones.GetValueOrDefault(id, new()) };
    }

    [HttpPut("{id:guid}/relaciones")]
    public async Task<IActionResult> ActualizarRelaciones(Guid id, TareaRelacionesUpdateDto dto)
    {
        var tarea = await _db.Tareas.FindAsync(id);
        if (tarea is null) return NotFound();

        var nuevosIds = dto.RelacionadasIds.Where(otroId => otroId != id).Distinct().ToList();
        var validos = await _db.Tareas.Where(t => nuevosIds.Contains(t.Id)).Select(t => t.Id).ToListAsync();

        var actuales = await _db.TareasRelacionadas
            .Where(r => r.TareaOrigenId == id || r.TareaDestinoId == id)
            .ToListAsync();
        _db.TareasRelacionadas.RemoveRange(actuales);

        foreach (var otroId in validos)
        {
            _db.TareasRelacionadas.Add(new TareaRelacion { TareaOrigenId = id, TareaDestinoId = otroId });
            _db.TareasRelacionadas.Add(new TareaRelacion { TareaOrigenId = otroId, TareaDestinoId = id });
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static bool? ValidarBloqueo(EstadoTarea estado, string? motivo, Guid? responsableBloqueoId, DateOnly? fechaRevision) =>
        estado != EstadoTarea.Bloqueada
            ? null
            : !string.IsNullOrWhiteSpace(motivo) && responsableBloqueoId.HasValue && fechaRevision.HasValue;

    [HttpPost]
    public async Task<ActionResult<TareaDto>> Crear(TareaCreateDto dto)
    {
        var valido = ValidarBloqueo(dto.Estado, dto.MotivoBloqueo, dto.ResponsableBloqueoId, dto.FechaRevisionBloqueo);
        if (valido == false)
            return BadRequest("Una tarea bloqueada debe tener motivo, responsable y fecha de revisión.");

        var tarea = new Tarea
        {
            Titulo = dto.Titulo,
            Descripcion = dto.Descripcion,
            Tipo = dto.Tipo,
            Estado = dto.Estado,
            Prioridad = dto.Prioridad,
            ProyectoId = dto.ProyectoId,
            ResponsableId = dto.ResponsableId,
            EstimacionHoras = dto.EstimacionHoras,
            FechaInicio = dto.FechaInicio,
            FechaObjetivo = dto.FechaObjetivo,
            FechaCierre = dto.FechaCierre,
            MotivoBloqueo = dto.MotivoBloqueo,
            ResponsableBloqueoId = dto.ResponsableBloqueoId,
            FechaRevisionBloqueo = dto.FechaRevisionBloqueo,
            JiraTicketUrl = dto.JiraTicketUrl,
            JiraTicketClave = dto.JiraTicketClave,
        };
        if (tarea.Estado == EstadoTarea.Hecha && tarea.FechaCierre is null)
            tarea.FechaCierre = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.Tareas.Add(tarea);
        await _db.SaveChangesAsync();
        var creada = await BaseQuery().FirstAsync(t => t.Id == tarea.Id);
        return CreatedAtAction(nameof(Obtener), new { id = tarea.Id }, creada.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, TareaUpdateDto dto)
    {
        var valido = ValidarBloqueo(dto.Estado, dto.MotivoBloqueo, dto.ResponsableBloqueoId, dto.FechaRevisionBloqueo);
        if (valido == false)
            return BadRequest("Una tarea bloqueada debe tener motivo, responsable y fecha de revisión.");

        var tarea = await _db.Tareas.FindAsync(id);
        if (tarea is null) return NotFound();

        tarea.Titulo = dto.Titulo;
        tarea.Descripcion = dto.Descripcion;
        tarea.Tipo = dto.Tipo;
        tarea.Estado = dto.Estado;
        tarea.Prioridad = dto.Prioridad;
        tarea.ProyectoId = dto.ProyectoId;
        tarea.ResponsableId = dto.ResponsableId;
        tarea.EstimacionHoras = dto.EstimacionHoras;
        tarea.FechaInicio = dto.FechaInicio;
        tarea.FechaObjetivo = dto.FechaObjetivo;
        tarea.FechaCierre = dto.FechaCierre;
        tarea.MotivoBloqueo = dto.Estado == EstadoTarea.Bloqueada ? dto.MotivoBloqueo : null;
        tarea.ResponsableBloqueoId = dto.Estado == EstadoTarea.Bloqueada ? dto.ResponsableBloqueoId : null;
        tarea.FechaRevisionBloqueo = dto.Estado == EstadoTarea.Bloqueada ? dto.FechaRevisionBloqueo : null;
        tarea.JiraTicketUrl = dto.JiraTicketUrl;
        tarea.JiraTicketClave = dto.JiraTicketClave;
        if (tarea.Estado == EstadoTarea.Hecha && tarea.FechaCierre is null)
            tarea.FechaCierre = DateOnly.FromDateTime(DateTime.UtcNow);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Cambio rápido de estado, usado al arrastrar una tarjeta en el tablero Kanban.
    [HttpPatch("{id:guid}/estado")]
    public async Task<IActionResult> CambiarEstado(Guid id, TareaEstadoUpdateDto dto)
    {
        var tarea = await _db.Tareas.FindAsync(id);
        if (tarea is null) return NotFound();

        if (dto.Estado == EstadoTarea.Bloqueada && ValidarBloqueo(dto.Estado, tarea.MotivoBloqueo, tarea.ResponsableBloqueoId, tarea.FechaRevisionBloqueo) == false)
            return BadRequest("Para bloquear la tarea indica antes el motivo, el responsable y la fecha de revisión.");

        tarea.Estado = dto.Estado;
        if (dto.Estado == EstadoTarea.Hecha && tarea.FechaCierre is null)
            tarea.FechaCierre = DateOnly.FromDateTime(DateTime.UtcNow);
        if (dto.Estado != EstadoTarea.Bloqueada)
        {
            tarea.MotivoBloqueo = null;
            tarea.ResponsableBloqueoId = null;
            tarea.FechaRevisionBloqueo = null;
        }
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var tarea = await _db.Tareas.FindAsync(id);
        if (tarea is null) return NotFound();
        var relaciones = await _db.TareasRelacionadas
            .Where(r => r.TareaOrigenId == id || r.TareaDestinoId == id)
            .ToListAsync();
        _db.TareasRelacionadas.RemoveRange(relaciones);
        _db.Tareas.Remove(tarea);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("export")]
    public async Task<IActionResult> Exportar([FromQuery] Guid? proyectoId, [FromQuery] Guid? equipoId, [FromQuery] Guid? responsableId)
    {
        var query = BaseQuery();
        if (proyectoId.HasValue) query = query.Where(t => t.ProyectoId == proyectoId);
        if (equipoId.HasValue) query = query.Where(t => t.Proyecto!.EquipoId == equipoId);
        if (responsableId.HasValue) query = query.Where(t => t.ResponsableId == responsableId);
        var tareas = (await query.OrderBy(t => t.FechaObjetivo).ToListAsync()).Select(t => t.ToDto()).ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Titulo;Tipo;Estado;Prioridad;Proyecto;Responsable;EstimacionHoras;FechaObjetivo;Vencida;Bloqueada;MotivoBloqueo");
        foreach (var t in tareas)
        {
            sb.AppendLine($"{t.Titulo};{t.Tipo};{t.Estado};{t.Prioridad};{t.ProyectoCodigo};{t.ResponsableNombre};{t.EstimacionHoras};{t.FechaObjetivo};{t.EstaVencida};{t.Estado == EstadoTarea.Bloqueada};{t.MotivoBloqueo}");
        }
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "tareas.csv");
    }
}
