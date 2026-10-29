using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class NotaConfiguration : IEntityTypeConfiguration<Nota>
{
    public void Configure(EntityTypeBuilder<Nota> builder)
    {
        builder.ToTable("Notas");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Texto).IsRequired().HasMaxLength(4000);

        // Al eliminar una persona se eliminan las notas/comentarios que escribió
        // (son su contenido). Las tareas, riesgos y proyectos de los que era
        // responsable NO se eliminan: quedan sin responsable (ver SetNull en sus configuraciones).
        builder.HasOne(n => n.Autor)
            .WithMany(p => p.Notas)
            .HasForeignKey(n => n.AutorId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(n => n.Persona)
            .WithMany()
            .HasForeignKey(n => n.PersonaId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
