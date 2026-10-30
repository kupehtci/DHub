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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
