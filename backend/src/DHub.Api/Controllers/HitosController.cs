using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/hitos")]
public class HitosController : ControllerBase
{
    private readonly AppDbContext _db;
    public HitosController(AppDbContext db) => _db = db;

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
