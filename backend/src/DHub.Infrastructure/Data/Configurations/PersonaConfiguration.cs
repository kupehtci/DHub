using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class PersonaConfiguration : IEntityTypeConfiguration<Persona>
{
    public void Configure(EntityTypeBuilder<Persona> builder)
    {
        builder.ToTable("Personas");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Nombre).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Email).IsRequired().HasMaxLength(200);
        builder.HasIndex(p => p.Email).IsUnique();
        builder.Property(p => p.Rol).IsRequired().HasMaxLength(100);
        builder.Property(p => p.DisponibilidadSemanalHoras).HasColumnType("numeric(5,2)");

        builder.HasMany(p => p.Equipos)
            .WithMany(e => e.Miembros)
            .UsingEntity(j => j.ToTable("EquipoPersona"));
    }
}
