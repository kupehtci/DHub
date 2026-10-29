using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class TareaRelacionConfiguration : IEntityTypeConfiguration<TareaRelacion>
{
    public void Configure(EntityTypeBuilder<TareaRelacion> builder)
    {
        builder.ToTable("TareasRelacionadas");
        builder.HasKey(r => new { r.TareaOrigenId, r.TareaDestinoId });

        // Restrict en ambos lados: evita el error de EF "múltiples rutas de cascada" al
        // tener dos FK hacia la misma tabla. La limpieza de relaciones al borrar una tarea
        // se hace explícitamente en TareasController.Eliminar.
        builder.HasOne(r => r.TareaOrigen)
            .WithMany()
            .HasForeignKey(r => r.TareaOrigenId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.TareaDestino)
            .WithMany()
            .HasForeignKey(r => r.TareaDestinoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
