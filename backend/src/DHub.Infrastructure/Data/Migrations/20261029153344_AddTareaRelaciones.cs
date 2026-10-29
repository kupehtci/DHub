using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTareaRelaciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TareasRelacionadas",
                columns: table => new
                {
                    TareaOrigenId = table.Column<Guid>(type: "uuid", nullable: false),
                    TareaDestinoId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TareasRelacionadas", x => new { x.TareaOrigenId, x.TareaDestinoId });
                    table.ForeignKey(
                        name: "FK_TareasRelacionadas_Tareas_TareaDestinoId",
                        column: x => x.TareaDestinoId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TareasRelacionadas_Tareas_TareaOrigenId",
                        column: x => x.TareaOrigenId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TareasRelacionadas_TareaDestinoId",
                table: "TareasRelacionadas",
                column: "TareaDestinoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TareasRelacionadas");
        }
    }
}
