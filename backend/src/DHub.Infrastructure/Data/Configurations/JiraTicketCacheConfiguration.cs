using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class JiraTicketCacheConfiguration : IEntityTypeConfiguration<JiraTicketCache>
{
    public void Configure(EntityTypeBuilder<JiraTicketCache> builder)
    {
        builder.ToTable("JiraTicketsCache");
        builder.HasKey(c => c.Clave);
        builder.Property(c => c.Clave).HasMaxLength(50);
        builder.Property(c => c.Resumen).HasMaxLength(500);
        builder.Property(c => c.Estado).HasMaxLength(100);
        builder.Property(c => c.AsignadoNombre).HasMaxLength(200);
        builder.Property(c => c.Url).HasMaxLength(400);
    }
}
