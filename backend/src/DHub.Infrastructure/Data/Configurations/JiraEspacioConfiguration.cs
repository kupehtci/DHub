using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class JiraEspacioConfiguration : IEntityTypeConfiguration<JiraEspacio>
{
    public void Configure(EntityTypeBuilder<JiraEspacio> builder)
    {
        builder.ToTable("JiraEspacios");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Nombre).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Clave).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.Clave).IsUnique();
    }
}
