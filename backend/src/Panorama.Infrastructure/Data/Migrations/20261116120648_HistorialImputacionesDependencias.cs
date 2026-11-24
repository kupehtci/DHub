using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Panorama.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class HistorialImputacionesDependencias : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ActualizadoEn",
                table: "Tareas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreadoEn",
                table: "Tareas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "ActualizadoEn",
                table: "Riesgos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreadoEn",
                table: "Riesgos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "ActualizadoEn",
                table: "Hitos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreadoEn",
                table: "Hitos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "Imputaciones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TareaId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    Horas = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    Comentario = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActualizadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Imputaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Imputaciones_Personas_PersonaId",
                        column: x => x.PersonaId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Imputaciones_Tareas_TareaId",
                        column: x => x.TareaId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TareasDependencias",
                columns: table => new
                {
                    PredecesoraId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucesoraId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TareasDependencias", x => new { x.PredecesoraId, x.SucesoraId });
                    table.ForeignKey(
                        name: "FK_TareasDependencias_Tareas_PredecesoraId",
                        column: x => x.PredecesoraId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TareasDependencias_Tareas_SucesoraId",
                        column: x => x.SucesoraId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TareasHistorial",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TareaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Usuario = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Campo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ValorAnterior = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ValorNuevo = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TareasHistorial", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TareasHistorial_Tareas_TareaId",
                        column: x => x.TareaId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Imputaciones_PersonaId_Fecha",
                table: "Imputaciones",
                columns: new[] { "PersonaId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_Imputaciones_TareaId",
                table: "Imputaciones",
                column: "TareaId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasDependencias_SucesoraId",
                table: "TareasDependencias",
                column: "SucesoraId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasHistorial_TareaId_Fecha",
                table: "TareasHistorial",
                columns: new[] { "TareaId", "Fecha" });

            // Datos existentes: no hay fecha real de creación, se usa la mejor aproximación
            // disponible (inicio de la tarea o detección del riesgo, nunca en el futuro).
            migrationBuilder.Sql("""
                UPDATE "Tareas" SET
                    "CreadoEn" = LEAST(COALESCE("FechaInicio"::timestamp AT TIME ZONE 'UTC', now()), now()),
                    "ActualizadoEn" = now();
                UPDATE "Riesgos" SET
                    "CreadoEn" = LEAST("FechaDeteccion"::timestamp AT TIME ZONE 'UTC', now()),
                    "ActualizadoEn" = now();
                UPDATE "Hitos" SET "CreadoEn" = now(), "ActualizadoEn" = now();
                """);

            // Punto de partida del historial: el estado actual de cada tarea, para que las
            // analíticas de tiempo en cada estado tengan desde dónde contar.
            migrationBuilder.Sql("""
                INSERT INTO "TareasHistorial" ("Id", "TareaId", "Fecha", "Usuario", "Campo", "ValorAnterior", "ValorNuevo")
                SELECT gen_random_uuid(), "Id", now(), 'Sistema', 'HistorialIniciado', NULL,
                       CASE "Estado"
                           WHEN 0 THEN 'Backlog' WHEN 1 THEN 'Planificada' WHEN 2 THEN 'EnCurso'
                           WHEN 3 THEN 'EnRevision' WHEN 4 THEN 'Bloqueada' WHEN 5 THEN 'Hecha'
                           ELSE 'Cancelada'
                       END
                FROM "Tareas";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Imputaciones");

            migrationBuilder.DropTable(
                name: "TareasDependencias");

            migrationBuilder.DropTable(
                name: "TareasHistorial");

            migrationBuilder.DropColumn(
                name: "ActualizadoEn",
                table: "Tareas");

            migrationBuilder.DropColumn(
                name: "CreadoEn",
                table: "Tareas");

            migrationBuilder.DropColumn(
                name: "ActualizadoEn",
                table: "Riesgos");

            migrationBuilder.DropColumn(
                name: "CreadoEn",
                table: "Riesgos");

            migrationBuilder.DropColumn(
                name: "ActualizadoEn",
                table: "Hitos");

            migrationBuilder.DropColumn(
                name: "CreadoEn",
                table: "Hitos");
        }
    }
}
