using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class ProyectoConfiguration : IEntityTypeConfiguration<Proyecto>
{
    public void Configure(EntityTypeBuilder<Proyecto> builder)
    {
        builder.ToTable("Proyectos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Nombre).IsRequired().HasMaxLength(250);
        builder.Property(p => p.Codigo).IsRequired().HasMaxLength(50);
        builder.HasIndex(p => p.Codigo).IsUnique();
        builder.Property(p => p.SistemaInformacion).IsRequired().HasMaxLength(250);
        builder.Property(p => p.ClienteArea).IsRequired().HasMaxLength(250);

        builder.HasOne(p => p.Responsable)
            .WithMany()
            .HasForeignKey(p => p.ResponsableId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(p => p.Equipo)
            .WithMany(e => e.Proyectos)
            .HasForeignKey(p => p.EquipoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(p => p.Tareas)
            .WithOne(t => t.Proyecto)
            .HasForeignKey(t => t.ProyectoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Hitos)
            .WithOne(h => h.Proyecto)
            .HasForeignKey(h => h.ProyectoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Riesgos)
            .WithOne(r => r.Proyecto)
            .HasForeignKey(r => r.ProyectoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(p => p.Notas)
            .WithOne(n => n.Proyecto)
            .HasForeignKey(n => n.ProyectoId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
