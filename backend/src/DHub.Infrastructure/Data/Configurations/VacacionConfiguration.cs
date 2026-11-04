using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class VacacionConfiguration : IEntityTypeConfiguration<Vacacion>
{
    public void Configure(EntityTypeBuilder<Vacacion> builder)
    {
        builder.ToTable("Vacaciones");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Comentario).HasMaxLength(500);

        // Las vacaciones son un dato personal del propio registro (como las notas):
        // si se elimina la persona, no tiene sentido conservarlas.
        builder.HasOne(v => v.Persona)
            .WithMany()
            .HasForeignKey(v => v.PersonaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
