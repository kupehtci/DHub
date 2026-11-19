using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class TareaDependenciaConfiguration : IEntityTypeConfiguration<TareaDependencia>
{
    public void Configure(EntityTypeBuilder<TareaDependencia> builder)
    {
        builder.ToTable("TareasDependencias");
        builder.HasKey(d => new { d.PredecesoraId, d.SucesoraId });

        // Igual que TareasRelacionadas: Restrict en ambos lados (dos FK a la misma tabla);
        // la limpieza al borrar una tarea se hace en TareasController.Eliminar.
        builder.HasOne(d => d.Predecesora)
            .WithMany()
            .HasForeignKey(d => d.PredecesoraId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Sucesora)
            .WithMany()
            .HasForeignKey(d => d.SucesoraId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
