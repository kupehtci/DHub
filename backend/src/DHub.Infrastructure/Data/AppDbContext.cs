using System.Globalization;
using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DHub.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Persona> Personas => Set<Persona>();
    public DbSet<Equipo> Equipos => Set<Equipo>();
    public DbSet<Proyecto> Proyectos => Set<Proyecto>();
    public DbSet<Tarea> Tareas => Set<Tarea>();
    public DbSet<Hito> Hitos => Set<Hito>();
    public DbSet<Riesgo> Riesgos => Set<Riesgo>();
    public DbSet<Nota> Notas => Set<Nota>();
    public DbSet<Evento> Eventos => Set<Evento>();
    public DbSet<CuentaUsuario> CuentasUsuario => Set<CuentaUsuario>();
    public DbSet<TareaRelacion> TareasRelacionadas => Set<TareaRelacion>();
    public DbSet<Vacacion> Vacaciones => Set<Vacacion>();
    public DbSet<Festivo> Festivos => Set<Festivo>();
    public DbSet<TareaCambio> TareasHistorial => Set<TareaCambio>();
    public DbSet<TareaDependencia> TareasDependencias => Set<TareaDependencia>();
    public DbSet<JiraEspacio> JiraEspacios => Set<JiraEspacio>();
    public DbSet<JiraConfiguracion> JiraConfiguraciones => Set<JiraConfiguracion>();
    public DbSet<JiraTicketCache> JiraTicketsCache => Set<JiraTicketCache>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    // Campos de la tarea que se registran en su historial.
    private static readonly string[] CamposHistorial =
    [
        nameof(Tarea.Titulo), nameof(Tarea.Estado), nameof(Tarea.Prioridad), nameof(Tarea.Tipo),
        nameof(Tarea.ResponsableId), nameof(Tarea.ProyectoId), nameof(Tarea.EstimacionHoras),
        nameof(Tarea.FechaInicio), nameof(Tarea.FechaObjetivo), nameof(Tarea.FechaCierre),
        nameof(Tarea.MotivoBloqueo),
    ];

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        PrepararGuardadoAsync(CancellationToken.None).GetAwaiter().GetResult();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        await PrepararGuardadoAsync(cancellationToken);
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    // Antes de guardar: rellena las fechas de creación/actualización y añade al historial
    // de cada tarea los cambios de sus campos relevantes.
    private async Task PrepararGuardadoAsync(CancellationToken ct)
    {
        var ahora = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreadoEn = ahora;
                entry.Entity.ActualizadoEn = ahora;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.ActualizadoEn = ahora;
                entry.Property(nameof(IAuditable.CreadoEn)).IsModified = false;
            }
        }

        var tareas = ChangeTracker.Entries<Tarea>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified)
            .ToList();
        if (tareas.Count == 0) return;

        var cambios = new List<TareaCambio>();
        foreach (var entry in tareas)
        {
            if (entry.State == EntityState.Added)
            {
                cambios.Add(new TareaCambio { TareaId = entry.Entity.Id, Campo = "Creada", ValorNuevo = entry.Entity.Estado.ToString() });
                continue;
            }
            foreach (var campo in CamposHistorial)
            {
                var prop = entry.Property(campo);
                if (!prop.IsModified || Equals(prop.OriginalValue, prop.CurrentValue)) continue;
                cambios.Add(new TareaCambio
                {
                    TareaId = entry.Entity.Id,
                    Campo = campo,
                    ValorAnterior = AFormato(prop.OriginalValue),
                    ValorNuevo = AFormato(prop.CurrentValue),
                });
            }
        }
        if (cambios.Count == 0) return;

        // Identificadores -> nombres legibles (personas y proyectos), en una sola consulta por tipo.
        var personaIds = IdsDe(cambios, nameof(Tarea.ResponsableId));
        var proyectoIds = IdsDe(cambios, nameof(Tarea.ProyectoId));
        var personas = personaIds.Count == 0 ? new Dictionary<Guid, string>()
            : await Personas.Where(p => personaIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Nombre, ct);
        var proyectos = proyectoIds.Count == 0 ? new Dictionary<Guid, string>()
            : await Proyectos.Where(p => proyectoIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Codigo, ct);

        // Aplicación de un único usuario: el autor es el coordinador de la cuenta.
        var usuario = await CuentasUsuario.Select(c => c.NombreCompleto).FirstOrDefaultAsync(ct) ?? "Sistema";

        foreach (var c in cambios)
        {
            c.Fecha = ahora;
            c.Usuario = usuario;
            var nombres = c.Campo == nameof(Tarea.ResponsableId) ? personas
                : c.Campo == nameof(Tarea.ProyectoId) ? proyectos : null;
            if (nombres is null) continue;
            c.ValorAnterior = Resolver(c.ValorAnterior, nombres);
            c.ValorNuevo = Resolver(c.ValorNuevo, nombres);
        }
        TareasHistorial.AddRange(cambios);
    }

    private static string? AFormato(object? valor) => valor switch
    {
        null => null,
        DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        decimal m => m.ToString("0.##", CultureInfo.InvariantCulture),
        IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
        _ => valor.ToString(),
    };

    private static HashSet<Guid> IdsDe(IEnumerable<TareaCambio> cambios, string campo) =>
        cambios.Where(c => c.Campo == campo)
            .SelectMany(c => new[] { c.ValorAnterior, c.ValorNuevo })
            .Where(v => Guid.TryParse(v, out _))
            .Select(Guid.Parse)
            .ToHashSet();

    private static string? Resolver(string? valor, Dictionary<Guid, string> nombres) =>
        valor is not null && Guid.TryParse(valor, out var id) && nombres.TryGetValue(id, out var nombre) ? nombre : valor;
}
