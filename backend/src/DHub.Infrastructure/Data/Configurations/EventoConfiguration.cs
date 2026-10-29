using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class EventoConfiguration : IEntityTypeConfiguration<Evento>
{
    public void Configure(EntityTypeBuilder<Evento> builder)
    {
        builder.ToTable("Eventos");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Titulo).IsRequired().HasMaxLength(300);

        builder.HasOne(e => e.Proyecto)
            .WithMany(p => p.Eventos)
            .HasForeignKey(e => e.ProyectoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Equipo)
            .WithMany()
            .HasForeignKey(e => e.EquipoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Persona)
            .WithMany()
            .HasForeignKey(e => e.PersonaId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
