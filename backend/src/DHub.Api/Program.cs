using System.Text.Json.Serialization;
using DHub.Domain.Entities;
using DHub.Infrastructure.Data;
using DHub.Infrastructure.Data.Seed;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("CONNECTIONSTRINGS__DEFAULTCONNECTION")
    ?? "Host=localhost;Port=5432;Database=dhub;Username=dhub;Password=dhub";

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DHub API",
        Version = "v1",
        Description = "API del panel de coordinación técnica de proyectos y equipos (DHub)."
    });
    options.UseInlineDefinitionsForEnums();
});

var frontendOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    // Cuenta del coordinador: se crea una única vez a partir de las credenciales
    // por defecto. Si ya existe (p. ej. porque el usuario cambió su contraseña
    // desde la aplicación) no se vuelve a tocar en los siguientes arranques.
    var hasher = new PasswordHasher<CuentaUsuario>();
    var usuarioPorDefecto = builder.Configuration["Auth:Usuario"] ?? "coordinador";
    var passwordPorDefecto = builder.Configuration["Auth:Password"] ?? "coordinador123";
    var nombrePorDefecto = builder.Configuration["Auth:Nombre"] ?? "Coordinador Técnico";
    var hashPorDefecto = hasher.HashPassword(null!, passwordPorDefecto);
    await AccountSeeder.EnsureDefaultAsync(db, usuarioPorDefecto, nombrePorDefecto, hashPorDefecto);

    // Los datos de ejemplo solo se insertan si la base de datos está vacía (nunca
    // sobrescriben ni repiten datos ya existentes) y pueden desactivarse del todo
    // con Seed:Enabled=false.
    var seedHabilitado = builder.Configuration.GetValue("Seed:Enabled", true);
    if (seedHabilitado)
    {
        await SeedData.SeedAsync(db);
    }
}

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "DHub API v1");
    options.RoutePrefix = "swagger";
});

app.UseCors("Frontend");

app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
