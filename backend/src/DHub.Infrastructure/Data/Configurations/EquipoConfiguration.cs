using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class EquipoConfiguration : IEntityTypeConfiguration<Equipo>
{
    public void Configure(EntityTypeBuilder<Equipo> builder)
    {
        builder.ToTable("Equipos");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Nombre).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Descripcion).HasMaxLength(1000);

        builder.HasOne(e => e.LiderTecnico)
            .WithMany()
            .HasForeignKey(e => e.LiderTecnicoId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
