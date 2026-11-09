using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJiraTicketCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JiraTicketsCache",
                columns: table => new
                {
                    Clave = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Resumen = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Estado = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AsignadoNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ActualizadoJira = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Url = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    UltimaConsulta = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Error = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraTicketsCache", x => x.Clave);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JiraTicketsCache");
        }
    }
}
