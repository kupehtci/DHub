using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class EliminarImputaciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Imputaciones");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Imputaciones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TareaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActualizadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Comentario = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    Horas = table.Column<decimal>(type: "numeric(5,2)", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_Imputaciones_PersonaId_Fecha",
                table: "Imputaciones",
                columns: new[] { "PersonaId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_Imputaciones_TareaId",
                table: "Imputaciones",
                column: "TareaId");
        }
    }
}
