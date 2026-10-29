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
[Route("api/riesgos")]
public class RiesgosController : ControllerBase
{
    private readonly AppDbContext _db;
    public RiesgosController(AppDbContext db) => _db = db;

    private IQueryable<Riesgo> BaseQuery() => _db.Riesgos
        .Include(r => r.Proyecto)
        .Include(r => r.Tarea)
        .Include(r => r.Responsable);

    [HttpGet]
    public async Task<ActionResult<List<RiesgoDto>>> Listar(
        [FromQuery] Guid? proyectoId, [FromQuery] Guid? tareaId, [FromQuery] EstadoRiesgo? estado,
        [FromQuery] ImpactoRiesgo? impacto, [FromQuery] Guid? responsableId)
    {
        var query = BaseQuery();
        if (proyectoId.HasValue) query = query.Where(r => r.ProyectoId == proyectoId);
        if (tareaId.HasValue) query = query.Where(r => r.TareaId == tareaId);
        if (estado.HasValue) query = query.Where(r => r.Estado == estado);
        if (impacto.HasValue) query = query.Where(r => r.Impacto == impacto);
        if (responsableId.HasValue) query = query.Where(r => r.ResponsableId == responsableId);

        var riesgos = await query.OrderByDescending(r => r.Impacto).ThenBy(r => r.FechaRevision).ToListAsync();
        return riesgos.Select(r => r.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RiesgoDto>> Obtener(Guid id)
    {
        var riesgo = await BaseQuery().FirstOrDefaultAsync(r => r.Id == id);
        if (riesgo is null) return NotFound();
        return riesgo.ToDto();
    }

    [HttpPost]
    public async Task<ActionResult<RiesgoDto>> Crear(RiesgoCreateDto dto)
    {
        var riesgo = new Riesgo
        {
            ProyectoId = dto.ProyectoId,
            TareaId = dto.TareaId,
            Titulo = dto.Titulo,
            Descripcion = dto.Descripcion,
            Impacto = dto.Impacto,
            Probabilidad = dto.Probabilidad,
            ResponsableId = dto.ResponsableId,
            Estado = dto.Estado,
            FechaDeteccion = dto.FechaDeteccion,
            FechaRevision = dto.FechaRevision,
        };
        _db.Riesgos.Add(riesgo);
        await _db.SaveChangesAsync();
        var creado = await BaseQuery().FirstAsync(r => r.Id == riesgo.Id);
        return CreatedAtAction(nameof(Obtener), new { id = riesgo.Id }, creado.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, RiesgoUpdateDto dto)
    {
        var riesgo = await _db.Riesgos.FindAsync(id);
        if (riesgo is null) return NotFound();

        riesgo.ProyectoId = dto.ProyectoId;
        riesgo.TareaId = dto.TareaId;
        riesgo.Titulo = dto.Titulo;
        riesgo.Descripcion = dto.Descripcion;
        riesgo.Impacto = dto.Impacto;
        riesgo.Probabilidad = dto.Probabilidad;
        riesgo.ResponsableId = dto.ResponsableId;
        riesgo.Estado = dto.Estado;
        riesgo.FechaDeteccion = dto.FechaDeteccion;
        riesgo.FechaRevision = dto.FechaRevision;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var riesgo = await _db.Riesgos.FindAsync(id);
        if (riesgo is null) return NotFound();
        _db.Riesgos.Remove(riesgo);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("export")]
    public async Task<IActionResult> Exportar()
    {
        var riesgos = (await BaseQuery().OrderByDescending(r => r.Impacto).ToListAsync()).Select(r => r.ToDto()).ToList();
        var sb = new StringBuilder();
        sb.AppendLine("Titulo;Proyecto;Tarea;Impacto;Probabilidad;Responsable;Estado;FechaDeteccion;FechaRevision");
        foreach (var r in riesgos)
        {
            sb.AppendLine($"{r.Titulo};{r.ProyectoNombre};{r.TareaTitulo};{r.Impacto};{r.Probabilidad};{r.ResponsableNombre};{r.Estado};{r.FechaDeteccion};{r.FechaRevision}");
        }
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "riesgos.csv");
    }
}
