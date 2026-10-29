using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class RiesgoConfiguration : IEntityTypeConfiguration<Riesgo>
{
    public void Configure(EntityTypeBuilder<Riesgo> builder)
    {
        builder.ToTable("Riesgos");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Titulo).IsRequired().HasMaxLength(300);

        builder.HasOne(r => r.Responsable)
            .WithMany(p => p.RiesgosResponsable)
            .HasForeignKey(r => r.ResponsableId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
