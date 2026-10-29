using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class HitoConfiguration : IEntityTypeConfiguration<Hito>
{
    public void Configure(EntityTypeBuilder<Hito> builder)
    {
        builder.ToTable("Hitos");
        builder.HasKey(h => h.Id);
        builder.Property(h => h.Nombre).IsRequired().HasMaxLength(250);
    }
}
