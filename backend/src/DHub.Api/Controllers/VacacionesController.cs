using ClosedXML.Excel;
using DHub.Api.Dtos;
using DHub.Api.Services;
using DHub.Domain.Entities;
using DHub.Domain.Enums;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

[ApiController]
[Route("api/vacaciones")]
public class VacacionesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VacacionesController(AppDbContext db) => _db = db;

    private IQueryable<Vacacion> BaseQuery() => _db.Vacaciones.Include(v => v.Persona);

    [HttpGet]
    public async Task<ActionResult<List<VacacionDto>>> Listar(
        [FromQuery] Guid? personaId, [FromQuery] Guid? equipoId,
        [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta)
    {
        var query = BaseQuery();
        if (personaId.HasValue) query = query.Where(v => v.PersonaId == personaId);
        if (equipoId.HasValue) query = query.Where(v => v.Persona!.Equipos.Any(e => e.Id == equipoId));
        // Solapamiento de rango: la vacación es relevante si termina después de "desde" y empieza antes de "hasta".
        if (desde.HasValue) query = query.Where(v => v.FechaFin >= desde);
        if (hasta.HasValue) query = query.Where(v => v.FechaInicio <= hasta);

        var vacaciones = await query.OrderBy(v => v.FechaInicio).ToListAsync();
        return vacaciones.Select(v => v.ToDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VacacionDto>> Obtener(Guid id)
    {
        var vacacion = await BaseQuery().FirstOrDefaultAsync(v => v.Id == id);
        if (vacacion is null) return NotFound();
        return vacacion.ToDto();
    }

    [HttpPost]
    public async Task<ActionResult<VacacionDto>> Crear(VacacionCreateDto dto)
    {
        if (dto.FechaFin < dto.FechaInicio)
            return BadRequest("La fecha de fin no puede ser anterior a la fecha de inicio.");

        var persona = await _db.Personas.FindAsync(dto.PersonaId);
        if (persona is null) return NotFound("Persona no encontrada.");

        var vacacion = new Vacacion
        {
            PersonaId = dto.PersonaId,
            FechaInicio = dto.FechaInicio,
            FechaFin = dto.FechaFin,
            Comentario = dto.Comentario,
        };
        _db.Vacaciones.Add(vacacion);
        await _db.SaveChangesAsync();
        var creada = await BaseQuery().FirstAsync(v => v.Id == vacacion.Id);
        return CreatedAtAction(nameof(Obtener), new { id = vacacion.Id }, creada.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, VacacionUpdateDto dto)
    {
        if (dto.FechaFin < dto.FechaInicio)
            return BadRequest("La fecha de fin no puede ser anterior a la fecha de inicio.");

        var vacacion = await _db.Vacaciones.FindAsync(id);
        if (vacacion is null) return NotFound();

        vacacion.FechaInicio = dto.FechaInicio;
        vacacion.FechaFin = dto.FechaFin;
        vacacion.Comentario = dto.Comentario;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var vacacion = await _db.Vacaciones.FindAsync(id);
        if (vacacion is null) return NotFound();
        _db.Vacaciones.Remove(vacacion);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static readonly Dictionary<AmbitoFestivo, string> AmbitoLabel = new()
    {
        [AmbitoFestivo.Nacional] = "Nacional",
        [AmbitoFestivo.Autonomico] = "Autonómico",
        [AmbitoFestivo.Local] = "Local",
        [AmbitoFestivo.Otro] = "Otro",
    };

    private static IEnumerable<DateOnly> Dias(DateOnly inicio, DateOnly fin)
    {
        for (var d = inicio; d <= fin; d = d.AddDays(1)) yield return d;
    }

    private static bool EsFinDeSemana(DateOnly d) => d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    // Exporta a Excel las vacaciones y festivos que se solapan con el rango indicado
    // (por defecto, el año en curso). Incluye una hoja de resumen por persona en la que
    // solo cuentan los días dentro del rango.
    [HttpGet("export")]
    public async Task<IActionResult> Exportar([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta, [FromQuery] Guid? equipoId)
    {
        var hoy = DateOnly.FromDateTime(DateTime.Today);
        var ini = desde ?? new DateOnly(hoy.Year, 1, 1);
        var fin = hasta ?? new DateOnly(hoy.Year, 12, 31);
        if (fin < ini) return BadRequest("La fecha de fin no puede ser anterior a la fecha de inicio.");

        var personasQuery = _db.Personas.Include(p => p.Equipos).AsQueryable();
        if (equipoId.HasValue) personasQuery = personasQuery.Where(p => p.Equipos.Any(e => e.Id == equipoId));
        var personas = await personasQuery.OrderBy(p => p.Nombre).ToListAsync();
        var personaIds = personas.Select(p => p.Id).ToHashSet();

        var vacaciones = (await BaseQuery()
                .Where(v => v.FechaFin >= ini && v.FechaInicio <= fin)
                .OrderBy(v => v.FechaInicio)
                .ToListAsync())
            .Where(v => personaIds.Contains(v.PersonaId))
            .ToList();

        var festivos = (await _db.Festivos.Include(f => f.Personas)
                .Where(f => f.FechaFin >= ini && f.FechaInicio <= fin)
                .OrderBy(f => f.FechaInicio)
                .ToListAsync())
            .Where(f => f.Personas.Any(p => personaIds.Contains(p.Id)))
            .ToList();

        // Días festivos de cada persona, para no contarlos como días laborables de vacaciones.
        var festivosPorPersona = personas.ToDictionary(
            p => p.Id,
            p => festivos.Where(f => f.Personas.Any(x => x.Id == p.Id))
                .SelectMany(f => Dias(f.FechaInicio, f.FechaFin))
                .ToHashSet());

        int Laborables(Guid personaId, DateOnly a, DateOnly b) =>
            Dias(a, b).Count(d => !EsFinDeSemana(d) && !festivosPorPersona[personaId].Contains(d));

        using var libro = new XLWorkbook();

        // --- Resumen por persona ---
        var hResumen = libro.Worksheets.Add("Resumen");
        string[] cabResumen = ["Persona", "Equipos", "Días de vacaciones (naturales)", "Días de vacaciones (laborables)", "Festivos (laborables)"];
        for (var c = 0; c < cabResumen.Length; c++) hResumen.Cell(1, c + 1).Value = cabResumen[c];
        var fila = 2;
        foreach (var p in personas)
        {
            var naturales = 0;
            var laborables = 0;
            foreach (var v in vacaciones.Where(v => v.PersonaId == p.Id))
            {
                var a = v.FechaInicio < ini ? ini : v.FechaInicio;
                var b = v.FechaFin > fin ? fin : v.FechaFin;
                naturales += b.DayNumber - a.DayNumber + 1;
                laborables += Laborables(p.Id, a, b);
            }
            var festivosLaborables = festivosPorPersona[p.Id].Count(d => d >= ini && d <= fin && !EsFinDeSemana(d));

            hResumen.Cell(fila, 1).Value = p.Nombre;
            hResumen.Cell(fila, 2).Value = string.Join(", ", p.Equipos.Select(e => e.Nombre).OrderBy(n => n));
            hResumen.Cell(fila, 3).Value = naturales;
            hResumen.Cell(fila, 4).Value = laborables;
            hResumen.Cell(fila, 5).Value = festivosLaborables;
            fila++;
        }
        FormatearHoja(hResumen, cabResumen.Length, fila - 1);

        // --- Detalle de vacaciones ---
        var hVac = libro.Worksheets.Add("Vacaciones");
        string[] cabVac = ["Persona", "Inicio", "Fin", "Días naturales", "Días laborables", "Comentario"];
        for (var c = 0; c < cabVac.Length; c++) hVac.Cell(1, c + 1).Value = cabVac[c];
        fila = 2;
        foreach (var v in vacaciones.OrderBy(v => v.Persona!.Nombre).ThenBy(v => v.FechaInicio))
        {
            hVac.Cell(fila, 1).Value = v.Persona!.Nombre;
            hVac.Cell(fila, 2).Value = v.FechaInicio.ToDateTime(TimeOnly.MinValue);
            hVac.Cell(fila, 3).Value = v.FechaFin.ToDateTime(TimeOnly.MinValue);
            hVac.Cell(fila, 4).Value = v.FechaFin.DayNumber - v.FechaInicio.DayNumber + 1;
            hVac.Cell(fila, 5).Value = Laborables(v.PersonaId, v.FechaInicio, v.FechaFin);
            hVac.Cell(fila, 6).Value = v.Comentario ?? string.Empty;
            fila++;
        }
        hVac.Range(2, 2, Math.Max(fila - 1, 2), 3).Style.DateFormat.Format = "dd/mm/yyyy";
        FormatearHoja(hVac, cabVac.Length, fila - 1);

        // --- Festivos ---
        var hFest = libro.Worksheets.Add("Festivos");
        string[] cabFest = ["Festivo", "Ámbito", "Inicio", "Fin", "Días", "Nº personas", "Personas afectadas", "Comentario"];
        for (var c = 0; c < cabFest.Length; c++) hFest.Cell(1, c + 1).Value = cabFest[c];
        fila = 2;
        foreach (var f in festivos)
        {
            var afectadas = f.Personas.Where(p => personaIds.Contains(p.Id)).Select(p => p.Nombre).OrderBy(n => n).ToList();
            hFest.Cell(fila, 1).Value = f.Nombre;
            hFest.Cell(fila, 2).Value = AmbitoLabel[f.Ambito];
            hFest.Cell(fila, 3).Value = f.FechaInicio.ToDateTime(TimeOnly.MinValue);
            hFest.Cell(fila, 4).Value = f.FechaFin.ToDateTime(TimeOnly.MinValue);
            hFest.Cell(fila, 5).Value = f.FechaFin.DayNumber - f.FechaInicio.DayNumber + 1;
            hFest.Cell(fila, 6).Value = afectadas.Count;
            hFest.Cell(fila, 7).Value = string.Join(", ", afectadas);
            hFest.Cell(fila, 8).Value = f.Comentario ?? string.Empty;
            fila++;
        }
        hFest.Range(2, 3, Math.Max(fila - 1, 2), 4).Style.DateFormat.Format = "dd/mm/yyyy";
        FormatearHoja(hFest, cabFest.Length, fila - 1);
        hFest.Column(7).Width = Math.Min(hFest.Column(7).Width, 80);
        hFest.Column(7).Style.Alignment.WrapText = true;

        using var stream = new MemoryStream();
        libro.SaveAs(stream);
        var nombre = ini.Month == 1 && ini.Day == 1 && fin == new DateOnly(ini.Year, 12, 31)
            ? $"vacaciones_{ini.Year}.xlsx"
            : $"vacaciones_{ini:yyyyMMdd}_{fin:yyyyMMdd}.xlsx";
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nombre);
    }

    private static void FormatearHoja(IXLWorksheet hoja, int columnas, int ultimaFila)
    {
        var cabecera = hoja.Range(1, 1, 1, columnas);
        cabecera.Style.Font.Bold = true;
        cabecera.Style.Fill.BackgroundColor = XLColor.FromHtml("#E8EEF7");
        hoja.SheetView.FreezeRows(1);
        if (ultimaFila >= 1) hoja.Range(1, 1, Math.Max(ultimaFila, 1), columnas).SetAutoFilter();
        hoja.Columns(1, columnas).AdjustToContents();
    }
}
