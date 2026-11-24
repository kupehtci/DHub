using Panorama.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Panorama.Infrastructure.Data.Configurations;

public class FestivoConfiguration : IEntityTypeConfiguration<Festivo>
{
    public void Configure(EntityTypeBuilder<Festivo> builder)
    {
        builder.ToTable("Festivos");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Nombre).IsRequired().HasMaxLength(200);
        builder.Property(f => f.Comentario).HasMaxLength(500);

        // Al borrar una persona solo desaparece su vínculo con el festivo, no el festivo.
        builder.HasMany(f => f.Personas)
            .WithMany()
            .UsingEntity(j => j.ToTable("FestivoPersona"));
    }
}
