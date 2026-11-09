using DHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DHub.Infrastructure.Data.Seed;

// Inserta el catálogo de espacios Jira propios de la organización la primera vez que
// arranca la aplicación sobre una tabla vacía. No se repite ni sobrescribe en los
// siguientes arranques, igual que el resto de datos semilla de este proyecto.
public static class JiraEspacioSeeder
{
    private static readonly (string Nombre, string Clave)[] Espacios =
    [
        ("SI_GrayLog", "DESA0195"),
        ("SI_GESTION TECNICA DE OMC", "DESA0345"),
        ("SI_SonarQube", "DESA0425"),
        ("SI_NEXUS", "DESA0426"),
        ("SI_AZURE_DEVOPS", "DESA0442"),
        ("SI_SOLARWINDS_OMC", "DESA0500"),
        ("SI_WebServiceJira", "DESA0501"),
        ("SI_PolarisDoc", "DESA0506"),
        ("SI_PolarisFront", "DESA0509"),
        ("SI_PolarisIdP", "DESA0510"),
        ("SI_PolarisApiM", "DESA0511"),
        ("SI_PolarisBack", "DESA0518"),
        ("SI_OMC_Temas_Generales", "DESA0538"),
        ("SI_ProcesosSincronizacionJiraCloud", "DESA0547"),
        ("SI_Vault", "DESA0552"),
        ("SI_Kubernetes", "DESA0554"),
    ];

    public static async Task EnsureSeededAsync(AppDbContext db)
    {
        if (await db.JiraEspacios.AnyAsync())
        {
            return;
        }

        foreach (var (nombre, clave) in Espacios)
        {
            db.JiraEspacios.Add(new JiraEspacio { Nombre = nombre, Clave = clave });
        }
        await db.SaveChangesAsync();
    }
}
