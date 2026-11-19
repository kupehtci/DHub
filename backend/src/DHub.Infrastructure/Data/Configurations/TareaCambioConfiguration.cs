using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class TareaCambioConfiguration : IEntityTypeConfiguration<TareaCambio>
{
    public void Configure(EntityTypeBuilder<TareaCambio> builder)
    {
        builder.ToTable("TareasHistorial");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Usuario).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Campo).IsRequired().HasMaxLength(50);
        builder.Property(c => c.ValorAnterior).HasMaxLength(1000);
        builder.Property(c => c.ValorNuevo).HasMaxLength(1000);
        builder.HasIndex(c => new { c.TareaId, c.Fecha });

        builder.HasOne(c => c.Tarea)
            .WithMany(t => t.Historial)
            .HasForeignKey(c => c.TareaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
