using DHub.Api.Dtos;
using DHub.Domain.Entities;
using DHub.Domain.Enums;
using DHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Controllers;

// Capacidad y carga planificada por persona y semana, descontando vacaciones y festivos.
[ApiController]
[Route("api/capacidad")]
public class CapacidadController : ControllerBase
{
    private readonly AppDbContext _db;
    public CapacidadController(AppDbContext db) => _db = db;

    private static bool EsLaborable(DateOnly d) => d.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday);

    private static DateOnly Lunes(DateOnly d) => d.AddDays(-(((int)d.DayOfWeek + 6) % 7));

    private static IEnumerable<DateOnly> Dias(DateOnly a, DateOnly b)
    {
        for (var d = a; d <= b; d = d.AddDays(1)) yield return d;
    }

    // Días de ausencia por persona en el rango, con su motivo (vacaciones o nombre del festivo).
    private async Task<Dictionary<Guid, Dictionary<DateOnly, string>>> AusenciasPorDiaAsync(
        IReadOnlyCollection<Guid> personaIds, DateOnly desde, DateOnly hasta)
    {
        var resultado = personaIds.ToDictionary(id => id, _ => new Dictionary<DateOnly, string>());
        var vacaciones = await _db.Vacaciones
            .Where(v => personaIds.Contains(v.PersonaId) && v.FechaFin >= desde && v.FechaInicio <= hasta)
            .ToListAsync();
        foreach (var v in vacaciones)
            foreach (var d in Dias(Max(v.FechaInicio, desde), Min(v.FechaFin, hasta)))
                resultado[v.PersonaId][d] = "Vacaciones";

        var festivos = await _db.Festivos.Include(f => f.Personas)
            .Where(f => f.FechaFin >= desde && f.FechaInicio <= hasta)
            .ToListAsync();
        foreach (var f in festivos)
            foreach (var p in f.Personas.Where(p => resultado.ContainsKey(p.Id)))
                foreach (var d in Dias(Max(f.FechaInicio, desde), Min(f.FechaFin, hasta)))
                    resultado[p.Id].TryAdd(d, $"Festivo: {f.Nombre}");
        return resultado;
    }

    private static DateOnly Max(DateOnly a, DateOnly b) => a > b ? a : b;
    private static DateOnly Min(DateOnly a, DateOnly b) => a < b ? a : b;

    // Matriz persona × semana. La carga de cada tarea abierta es su estimación repartida a
    // partes iguales entre los días laborables (lunes a viernes) de su fecha de inicio a su
    // fecha objetivo: una tarea de 2 semanas estimada en 32 h carga 16 h en cada semana.
    // Las tareas sin fechas no se pueden situar y se devuelven aparte; las vencidas sin
    // cerrar cargan sus semanas pasadas y además se listan aparte como atrasadas.
    [HttpGet]
    public async Task<ActionResult<CapacidadDto>> Obtener(
        [FromQuery] DateOnly? desde, [FromQuery] int semanas = 12,
        [FromQuery] Guid? equipoId = null, [FromQuery] Guid? personaId = null, [FromQuery] DateOnly? hoy = null)
    {
        semanas = Math.Clamp(semanas, 1, 52);
        var fechaHoy = hoy ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var inicio = Lunes(desde ?? fechaHoy);
        var fin = inicio.AddDays(semanas * 7 - 1);

        var personasQuery = _db.Personas.Include(p => p.Equipos).Where(p => p.Estado != EstadoPersona.Inactivo);
        if (equipoId.HasValue) personasQuery = personasQuery.Where(p => p.Equipos.Any(e => e.Id == equipoId));
        if (personaId.HasValue) personasQuery = personasQuery.Where(p => p.Id == personaId);
        var personas = await personasQuery.OrderBy(p => p.Nombre).ToListAsync();
        var ids = personas.Select(p => p.Id).ToList();

        var ausencias = await AusenciasPorDiaAsync(ids, inicio, fin);

        var tareas = await _db.Tareas.Include(t => t.Proyecto)
            .Where(t => t.ResponsableId != null && ids.Contains(t.ResponsableId.Value)
                && t.Estado != EstadoTarea.Hecha && t.Estado != EstadoTarea.Cancelada && t.EstimacionHoras > 0)
            .ToListAsync();

        var resultado = new List<CapacidadPersonaDto>();
        foreach (var p in personas)
        {
            var ausP = ausencias[p.Id];
            var horasDia = p.DisponibilidadSemanalHoras / 5m;
            // Carga por día y desglose por tarea.
            var cargaDia = new Dictionary<DateOnly, decimal>();
            var desglose = new Dictionary<DateOnly, Dictionary<Guid, decimal>>();
            var sinPlanificar = new List<CapacidadTareaDto>();
            var atrasadas = new List<CapacidadTareaDto>();

            foreach (var t in tareas.Where(t => t.ResponsableId == p.Id))
            {
                var estimacion = t.EstimacionHoras;
                if (t.FechaInicio is null && t.FechaObjetivo is null)
                {
                    sinPlanificar.Add(new CapacidadTareaDto(t.Id, t.Titulo, t.Proyecto?.Codigo ?? "", Math.Round(estimacion, 1), false));
                    continue;
                }

                // Con una sola fecha, la tarea ocupa ese único día.
                var desdeTarea = t.FechaInicio ?? t.FechaObjetivo!.Value;
                var objetivo = t.FechaObjetivo ?? t.FechaInicio!.Value;
                if (objetivo < desdeTarea) (desdeTarea, objetivo) = (objetivo, desdeTarea);
                if (objetivo < fechaHoy)
                    atrasadas.Add(new CapacidadTareaDto(t.Id, t.Titulo, t.Proyecto?.Codigo ?? "", Math.Round(estimacion, 1), true));

                var diasTarea = Dias(desdeTarea, objetivo).Where(EsLaborable).ToList();
                if (diasTarea.Count == 0) diasTarea = [objetivo];

                var porDia = estimacion / diasTarea.Count;
                foreach (var d in diasTarea)
                {
                    cargaDia[d] = cargaDia.GetValueOrDefault(d) + porDia;
                    if (!desglose.TryGetValue(d, out var porTarea)) desglose[d] = porTarea = new();
                    porTarea[t.Id] = porTarea.GetValueOrDefault(t.Id) + porDia;
                }
            }

            var semanasDto = new List<CapacidadSemanaDto>();
            for (var s = 0; s < semanas; s++)
            {
                var lunes = inicio.AddDays(s * 7);
                var laborables = Dias(lunes, lunes.AddDays(4)).ToList();
                var diasAusencia = laborables.Where(ausP.ContainsKey).ToList();
                var capacidad = horasDia * (laborables.Count - diasAusencia.Count);
                var diasSemana = Dias(lunes, lunes.AddDays(6)).ToList();
                var carga = diasSemana.Sum(d => cargaDia.GetValueOrDefault(d));
                var tareasSemana = diasSemana
                    .SelectMany(d => desglose.GetValueOrDefault(d) ?? new())
                    .GroupBy(kv => kv.Key)
                    .Select(g =>
                    {
                        var t = tareas.First(x => x.Id == g.Key);
                        return new CapacidadTareaDto(t.Id, t.Titulo, t.Proyecto?.Codigo ?? "", Math.Round(g.Sum(kv => kv.Value), 1), false);
                    })
                    .OrderByDescending(x => x.Horas)
                    .ToList();
                var motivos = diasAusencia.Select(d => ausP[d]).Distinct().ToList();
                semanasDto.Add(new CapacidadSemanaDto(lunes, Math.Round(capacidad, 1), Math.Round(carga, 1), diasAusencia.Count, motivos, tareasSemana));
            }

            resultado.Add(new CapacidadPersonaDto(
                p.Id, p.Nombre, p.Equipos.Select(e => new EquipoResumenDto(e.Id, e.Nombre)).ToList(),
                p.DisponibilidadSemanalHoras,
                Math.Round(sinPlanificar.Sum(x => x.Horas), 1), Math.Round(atrasadas.Sum(x => x.Horas), 1),
                sinPlanificar.OrderByDescending(x => x.Horas).ToList(), atrasadas.OrderByDescending(x => x.Horas).ToList(),
                semanasDto));
        }

        return new CapacidadDto(inicio, semanas, resultado);
    }

    // Vacaciones y festivos de una persona que se solapan con un rango: lo usa el formulario
    // de tarea para avisar si se planifica trabajo en días en que la persona no está.
    [HttpGet("ausencias")]
    public async Task<ActionResult<List<AusenciaDto>>> Ausencias([FromQuery] Guid personaId, [FromQuery] DateOnly desde, [FromQuery] DateOnly hasta)
    {
        if (hasta < desde) (desde, hasta) = (hasta, desde);
        var vacaciones = await _db.Vacaciones
            .Where(v => v.PersonaId == personaId && v.FechaFin >= desde && v.FechaInicio <= hasta)
            .Select(v => new AusenciaDto("Vacaciones", v.Comentario ?? "Vacaciones", v.FechaInicio, v.FechaFin))
            .ToListAsync();
        var festivos = await _db.Festivos
            .Where(f => f.Personas.Any(p => p.Id == personaId) && f.FechaFin >= desde && f.FechaInicio <= hasta)
            .Select(f => new AusenciaDto("Festivo", f.Nombre, f.FechaInicio, f.FechaFin))
            .ToListAsync();
        return vacaciones.Concat(festivos).OrderBy(a => a.FechaInicio).ToList();
    }
}
