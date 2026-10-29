using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class TareaConfiguration : IEntityTypeConfiguration<Tarea>
{
    public void Configure(EntityTypeBuilder<Tarea> builder)
    {
        builder.ToTable("Tareas");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Titulo).IsRequired().HasMaxLength(300);
        builder.Property(t => t.EstimacionHoras).HasColumnType("numeric(6,2)");
        builder.Ignore(t => t.EstaVencida);

        builder.HasOne(t => t.Responsable)
            .WithMany(p => p.TareasAsignadas)
            .HasForeignKey(t => t.ResponsableId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.ResponsableBloqueo)
            .WithMany()
            .HasForeignKey(t => t.ResponsableBloqueoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(t => t.Notas)
            .WithOne(n => n.Tarea)
            .HasForeignKey(n => n.TareaId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(t => t.Riesgos)
            .WithOne(r => r.Tarea)
            .HasForeignKey(r => r.TareaId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
