using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Personas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Rol = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisponibilidadSemanalHoras = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Personas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Equipos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LiderTecnicoId = table.Column<Guid>(type: "uuid", nullable: true),
                    Descripcion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Equipos_Personas_LiderTecnicoId",
                        column: x => x.LiderTecnicoId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "EquipoPersona",
                columns: table => new
                {
                    EquiposId = table.Column<Guid>(type: "uuid", nullable: false),
                    MiembrosId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipoPersona", x => new { x.EquiposId, x.MiembrosId });
                    table.ForeignKey(
                        name: "FK_EquipoPersona_Equipos_EquiposId",
                        column: x => x.EquiposId,
                        principalTable: "Equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EquipoPersona_Personas_MiembrosId",
                        column: x => x.MiembrosId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Proyectos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SistemaInformacion = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    ClienteArea = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    ResponsableId = table.Column<Guid>(type: "uuid", nullable: true),
                    EquipoId = table.Column<Guid>(type: "uuid", nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    FechaInicio = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaFin = table.Column<DateOnly>(type: "date", nullable: true),
                    Prioridad = table.Column<int>(type: "integer", nullable: false),
                    JiraProyectoUrl = table.Column<string>(type: "text", nullable: true),
                    JiraClaveProyecto = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Proyectos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Proyectos_Equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "Equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Proyectos_Personas_ResponsableId",
                        column: x => x.ResponsableId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Eventos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: true),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    FechaInicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaFin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProyectoId = table.Column<Guid>(type: "uuid", nullable: true),
                    EquipoId = table.Column<Guid>(type: "uuid", nullable: true),
                    PersonaId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Eventos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Eventos_Equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "Equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Eventos_Personas_PersonaId",
                        column: x => x.PersonaId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Eventos_Proyectos_ProyectoId",
                        column: x => x.ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Hitos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProyectoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Hitos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Hitos_Proyectos_ProyectoId",
                        column: x => x.ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tareas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: true),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    Prioridad = table.Column<int>(type: "integer", nullable: false),
                    ProyectoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResponsableId = table.Column<Guid>(type: "uuid", nullable: true),
                    EstimacionHoras = table.Column<decimal>(type: "numeric(6,2)", nullable: false),
                    FechaInicio = table.Column<DateOnly>(type: "date", nullable: true),
                    FechaObjetivo = table.Column<DateOnly>(type: "date", nullable: true),
                    FechaCierre = table.Column<DateOnly>(type: "date", nullable: true),
                    MotivoBloqueo = table.Column<string>(type: "text", nullable: true),
                    ResponsableBloqueoId = table.Column<Guid>(type: "uuid", nullable: true),
                    FechaRevisionBloqueo = table.Column<DateOnly>(type: "date", nullable: true),
                    JiraTicketClave = table.Column<string>(type: "text", nullable: true),
                    JiraTicketUrl = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tareas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tareas_Personas_ResponsableBloqueoId",
                        column: x => x.ResponsableBloqueoId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Tareas_Personas_ResponsableId",
                        column: x => x.ResponsableId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Tareas_Proyectos_ProyectoId",
                        column: x => x.ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AutorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    Texto = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    ProyectoId = table.Column<Guid>(type: "uuid", nullable: true),
                    TareaId = table.Column<Guid>(type: "uuid", nullable: true),
                    PersonaId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notas_Personas_AutorId",
                        column: x => x.AutorId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Notas_Personas_PersonaId",
                        column: x => x.PersonaId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Notas_Proyectos_ProyectoId",
                        column: x => x.ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Notas_Tareas_TareaId",
                        column: x => x.TareaId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Riesgos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProyectoId = table.Column<Guid>(type: "uuid", nullable: true),
                    TareaId = table.Column<Guid>(type: "uuid", nullable: true),
                    Titulo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: true),
                    Impacto = table.Column<int>(type: "integer", nullable: false),
                    Probabilidad = table.Column<int>(type: "integer", nullable: false),
                    ResponsableId = table.Column<Guid>(type: "uuid", nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    FechaDeteccion = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaRevision = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Riesgos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Riesgos_Personas_ResponsableId",
                        column: x => x.ResponsableId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Riesgos_Proyectos_ProyectoId",
                        column: x => x.ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Riesgos_Tareas_TareaId",
                        column: x => x.TareaId,
                        principalTable: "Tareas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EquipoPersona_MiembrosId",
                table: "EquipoPersona",
                column: "MiembrosId");

            migrationBuilder.CreateIndex(
                name: "IX_Equipos_LiderTecnicoId",
                table: "Equipos",
                column: "LiderTecnicoId");

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_EquipoId",
                table: "Eventos",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_PersonaId",
                table: "Eventos",
                column: "PersonaId");

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_ProyectoId",
                table: "Eventos",
                column: "ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_Hitos_ProyectoId",
                table: "Hitos",
                column: "ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_Notas_AutorId",
                table: "Notas",
                column: "AutorId");

            migrationBuilder.CreateIndex(
                name: "IX_Notas_PersonaId",
                table: "Notas",
                column: "PersonaId");

            migrationBuilder.CreateIndex(
                name: "IX_Notas_ProyectoId",
                table: "Notas",
                column: "ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_Notas_TareaId",
                table: "Notas",
                column: "TareaId");

            migrationBuilder.CreateIndex(
                name: "IX_Personas_Email",
                table: "Personas",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proyectos_Codigo",
                table: "Proyectos",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proyectos_EquipoId",
                table: "Proyectos",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_Proyectos_ResponsableId",
                table: "Proyectos",
                column: "ResponsableId");

            migrationBuilder.CreateIndex(
                name: "IX_Riesgos_ProyectoId",
                table: "Riesgos",
                column: "ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_Riesgos_ResponsableId",
                table: "Riesgos",
                column: "ResponsableId");

            migrationBuilder.CreateIndex(
                name: "IX_Riesgos_TareaId",
                table: "Riesgos",
                column: "TareaId");

            migrationBuilder.CreateIndex(
                name: "IX_Tareas_ProyectoId",
                table: "Tareas",
                column: "ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_Tareas_ResponsableBloqueoId",
                table: "Tareas",
                column: "ResponsableBloqueoId");

            migrationBuilder.CreateIndex(
                name: "IX_Tareas_ResponsableId",
                table: "Tareas",
                column: "ResponsableId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EquipoPersona");

            migrationBuilder.DropTable(
                name: "Eventos");

            migrationBuilder.DropTable(
                name: "Hitos");

            migrationBuilder.DropTable(
                name: "Notas");

            migrationBuilder.DropTable(
                name: "Riesgos");

            migrationBuilder.DropTable(
                name: "Tareas");

            migrationBuilder.DropTable(
                name: "Proyectos");

            migrationBuilder.DropTable(
                name: "Equipos");

            migrationBuilder.DropTable(
                name: "Personas");
        }
    }
}
