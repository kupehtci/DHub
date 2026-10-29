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
[Route("api/personas")]
public class PersonasController : ControllerBase
{
    private readonly AppDbContext _db;
    public PersonasController(AppDbContext db) => _db = db;

    private IQueryable<Persona> BaseQuery() => _db.Personas
        .Include(p => p.Equipos)
        .Include(p => p.TareasAsignadas);

    [HttpGet]
    public async Task<ActionResult<List<PersonaDto>>> Listar(
        [FromQuery] Guid? equipoId, [FromQuery] EstadoPersona? estado, [FromQuery] string? q, [FromQuery] bool? sinEquipo)
    {
        var query = BaseQuery();
        if (equipoId.HasValue) query = query.Where(p => p.Equipos.Any(e => e.Id == equipoId));
        if (estado.HasValue) query = query.Where(p => p.Estado == estado);
        if (sinEquipo == true) query = query.Where(p => p.Equipos.Count == 0);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(p => p.Nombre.Contains(q) || p.Email.Contains(q) || p.Rol.Contains(q));

        var personas = await query.OrderBy(p => p.Nombre).ToListAsync();
        return personas.Select(p => p.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PersonaDetalleDto>> Obtener(Guid id)
    {
        var p = await BaseQuery()
            .Include(p => p.TareasAsignadas).ThenInclude(t => t.Proyecto)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (p is null) return NotFound();

        var tareas = p.TareasAsignadas.OrderBy(t => t.FechaObjetivo).ToList();
        var equipos = p.Equipos.OrderBy(e => e.Nombre).Select(e => new EquipoResumenDto(e.Id, e.Nombre)).ToList();
        var dto = new PersonaDetalleDto(
            p.Id, p.Nombre, p.Email, p.Rol, equipos,
            p.DisponibilidadSemanalHoras, p.Estado,
            tareas.Where(t => t.EsActiva()).Sum(t => t.EstimacionHoras),
            tareas.Where(t => t.EsActiva()).Select(t => t.ToDto()).ToList(),
            tareas.Where(t => t.Estado == EstadoTarea.Backlog || t.Estado == EstadoTarea.Planificada).Select(t => t.ToDto()).ToList(),
            tareas.Where(t => t.Estado == EstadoTarea.Bloqueada).Select(t => t.ToDto()).ToList(),
            tareas.Where(t => t.FechaObjetivo.HasValue && t.Estado != EstadoTarea.Hecha && t.Estado != EstadoTarea.Cancelada)
                .OrderBy(t => t.FechaObjetivo).Take(10).Select(t => t.ToDto()).ToList()
        );
        return dto;
    }

    private async Task<List<Equipo>> ResolverEquiposAsync(List<Guid> equipoIds) =>
        equipoIds.Count == 0 ? new List<Equipo>() : await _db.Equipos.Where(e => equipoIds.Contains(e.Id)).ToListAsync();

    [HttpPost]
    public async Task<ActionResult<PersonaDto>> Crear(PersonaCreateDto dto)
    {
        var persona = new Persona
        {
            Nombre = dto.Nombre,
            Email = dto.Email,
            Rol = dto.Rol,
            Equipos = await ResolverEquiposAsync(dto.EquipoIds),
            DisponibilidadSemanalHoras = dto.DisponibilidadSemanalHoras,
            Estado = dto.Estado,
        };
        _db.Personas.Add(persona);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Obtener), new { id = persona.Id }, persona.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, PersonaUpdateDto dto)
    {
        var persona = await _db.Personas.Include(p => p.Equipos).FirstOrDefaultAsync(p => p.Id == id);
        if (persona is null) return NotFound();

        persona.Nombre = dto.Nombre;
        persona.Email = dto.Email;
        persona.Rol = dto.Rol;
        persona.Equipos = await ResolverEquiposAsync(dto.EquipoIds);
        persona.DisponibilidadSemanalHoras = dto.DisponibilidadSemanalHoras;
        persona.Estado = dto.Estado;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var persona = await _db.Personas.FindAsync(id);
        if (persona is null) return NotFound();
        _db.Personas.Remove(persona);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("export")]
    public async Task<IActionResult> Exportar([FromQuery] Guid? equipoId, [FromQuery] EstadoPersona? estado)
    {
        var query = BaseQuery();
        if (equipoId.HasValue) query = query.Where(p => p.Equipos.Any(e => e.Id == equipoId));
        if (estado.HasValue) query = query.Where(p => p.Estado == estado);
        var personas = (await query.OrderBy(p => p.Nombre).ToListAsync()).Select(p => p.ToDto()).ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Nombre;Email;Rol;Equipos;Disponibilidad;Estado;CargaHoras;TareasActivas;TareasBloqueadas;TareasVencidas");
        foreach (var p in personas)
        {
            var equipos = string.Join(" / ", p.Equipos.Select(e => e.Nombre));
            sb.AppendLine($"{p.Nombre};{p.Email};{p.Rol};{equipos};{p.DisponibilidadSemanalHoras};{p.Estado};{p.CargaHoras};{p.TareasActivas};{p.TareasBloqueadas};{p.TareasVencidas}");
        }
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "personas.csv");
    }
}
