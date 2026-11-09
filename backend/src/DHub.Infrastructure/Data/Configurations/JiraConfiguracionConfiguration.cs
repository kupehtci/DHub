using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class JiraConfiguracionConfiguration : IEntityTypeConfiguration<JiraConfiguracion>
{
    public void Configure(EntityTypeBuilder<JiraConfiguracion> builder)
    {
        builder.ToTable("JiraConfiguracion");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.BaseUrl).IsRequired().HasMaxLength(300);
        builder.Property(c => c.Email).IsRequired().HasMaxLength(200);
        builder.Property(c => c.ApiToken).IsRequired().HasMaxLength(500);
    }
}
