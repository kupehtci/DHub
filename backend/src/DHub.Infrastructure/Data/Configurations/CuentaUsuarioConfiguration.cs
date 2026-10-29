using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DHub.Infrastructure.Data.Configurations;

public class CuentaUsuarioConfiguration : IEntityTypeConfiguration<CuentaUsuario>
{
    public void Configure(EntityTypeBuilder<CuentaUsuario> builder)
    {
        builder.ToTable("CuentasUsuario");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.NombreUsuario).IsRequired().HasMaxLength(100);
        builder.HasIndex(c => c.NombreUsuario).IsUnique();
        builder.Property(c => c.NombreCompleto).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Email).HasMaxLength(200);
        builder.Property(c => c.PasswordHash).IsRequired();
    }
}
