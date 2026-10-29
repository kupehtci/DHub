using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixNotaAutorCascadeDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notas_Personas_AutorId",
                table: "Notas");

            migrationBuilder.AddForeignKey(
                name: "FK_Notas_Personas_AutorId",
                table: "Notas",
                column: "AutorId",
                principalTable: "Personas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notas_Personas_AutorId",
                table: "Notas");

            migrationBuilder.AddForeignKey(
                name: "FK_Notas_Personas_AutorId",
                table: "Notas",
                column: "AutorId",
                principalTable: "Personas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
