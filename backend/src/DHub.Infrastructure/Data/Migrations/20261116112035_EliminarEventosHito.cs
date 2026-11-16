using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class EliminarEventosHito : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Los eventos de tipo "Hito" (Tipo = 2) desaparecen: los hitos son solo de proyecto.
            // 1) Los que tienen proyecto pasan a ser hitos reales de ese proyecto (fecha en hora de Madrid).
            migrationBuilder.Sql("""
                INSERT INTO "Hitos" ("Id", "ProyectoId", "Nombre", "Fecha", "Estado", "Descripcion")
                SELECT "Id", "ProyectoId", LEFT("Titulo", 250),
                       ("FechaInicio" AT TIME ZONE 'Europe/Madrid')::date, 0, "Descripcion"
                FROM "Eventos"
                WHERE "Tipo" = 2 AND "ProyectoId" IS NOT NULL;

                DELETE FROM "Eventos" WHERE "Tipo" = 2 AND "ProyectoId" IS NOT NULL;
                """);

            // 2) Los que no tienen proyecto no pueden ser hitos: se conservan como eventos "Otro" (Tipo = 3).
            migrationBuilder.Sql("""UPDATE "Eventos" SET "Tipo" = 3 WHERE "Tipo" = 2;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Conversión de datos sin vuelta atrás exacta: no se puede saber qué hitos venían de eventos.
        }
    }
}
