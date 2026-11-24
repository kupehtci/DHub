using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Panorama.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFestivos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Festivos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Ambito = table.Column<int>(type: "integer", nullable: false),
                    FechaInicio = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaFin = table.Column<DateOnly>(type: "date", nullable: false),
                    Comentario = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Festivos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FestivoPersona",
                columns: table => new
                {
                    FestivoId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonasId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FestivoPersona", x => new { x.FestivoId, x.PersonasId });
                    table.ForeignKey(
                        name: "FK_FestivoPersona_Festivos_FestivoId",
                        column: x => x.FestivoId,
                        principalTable: "Festivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FestivoPersona_Personas_PersonasId",
                        column: x => x.PersonasId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FestivoPersona_PersonasId",
                table: "FestivoPersona",
                column: "PersonasId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FestivoPersona");

            migrationBuilder.DropTable(
                name: "Festivos");
        }
    }
}
