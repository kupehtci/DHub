using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DHub.Infrastructure.Data.Seed;

// Crea la cuenta del coordinador la primera vez que arranca la aplicación
// (a partir de las credenciales por defecto de configuración). Si la cuenta
// ya existe -por ejemplo porque el usuario ya cambió su contraseña- no se toca.
public static class AccountSeeder
{
    public static async Task EnsureDefaultAsync(AppDbContext db, string nombreUsuario, string nombreCompleto, string passwordHash)
    {
        if (await db.CuentasUsuario.AnyAsync())
        {
            return;
        }

        db.CuentasUsuario.Add(new CuentaUsuario
        {
            NombreUsuario = nombreUsuario,
            NombreCompleto = nombreCompleto,
            PasswordHash = passwordHash,
        });
        await db.SaveChangesAsync();
    }
}
