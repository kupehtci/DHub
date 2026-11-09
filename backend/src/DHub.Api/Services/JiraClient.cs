using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DHub.Domain.Entities;
using DHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DHub.Api.Services;

public class JiraNoConfiguradoException : Exception
{
}

public class JiraApiException : Exception
{
    public JiraApiException(string mensaje) : base(mensaje) { }
}

// Cliente mínimo de la REST API v3 de Jira Cloud. Lee la configuración de conexión
// (URL, email, API token) desde la base de datos, no de appsettings/env, porque el
// propio coordinador la gestiona desde Configuración > Mi cuenta.
//
// Los tickets individuales (ObtenerTicketsConCacheAsync) se guardan en una caché con
// TTL para poder mostrar una etiqueta de estado "en vivo" en toda la aplicación sin
// machacar la API de Jira; la búsqueda por proyecto (BuscarTicketsDeProyectoAsync) es
// siempre en directo, porque se usa en una pestaña que el usuario abre a propósito.
public class JiraClient
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly AppDbContext _db;
    private readonly HttpClient _http;

    public JiraClient(AppDbContext db, HttpClient http)
    {
        _db = db;
        _http = http;
    }

    public async Task<JiraConfiguracion?> ObtenerConfiguracionAsync() =>
        await _db.JiraConfiguraciones.AsNoTracking().FirstOrDefaultAsync();

    private static (string BaseUrl, AuthenticationHeaderValue Auth) PrepararConexion(JiraConfiguracion cfg)
    {
        var url = cfg.BaseUrl.TrimEnd('/');
        var credenciales = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{cfg.Email}:{cfg.ApiToken}"));
        return (url, new AuthenticationHeaderValue("Basic", credenciales));
    }

    public async Task<(bool Ok, string Mensaje)> ProbarConexionAsync(string baseUrl, string email, string apiToken)
    {
        var (url, auth) = PrepararConexion(new JiraConfiguracion { BaseUrl = baseUrl, Email = email, ApiToken = apiToken });
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/api/3/myself");
            request.Headers.Authorization = auth;
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            using var response = await _http.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                return (false, "Email o API token incorrectos.");
            if (!response.IsSuccessStatusCode)
                return (false, $"Jira respondió con error {(int)response.StatusCode}. Revisa la URL.");

            using var stream = await response.Content.ReadAsStreamAsync();
            using var json = await JsonDocument.ParseAsync(stream);
            var nombre = json.RootElement.TryGetProperty("displayName", out var n) ? n.GetString() : null;
            return (true, $"Conexión correcta. Autenticado como {nombre ?? email}.");
        }
        catch (HttpRequestException ex)
        {
            return (false, $"No se ha podido conectar con esa URL ({ex.Message}).");
        }
        catch (TaskCanceledException)
        {
            return (false, "La conexión con Jira ha tardado demasiado (timeout).");
        }
    }

    // Fetch en directo de un ticket (sin pasar por caché), usado por "Comprobar en Jira":
    // el usuario ha pedido expresamente un dato fresco. Aun así, el resultado se guarda
    // en caché para que el resto de la aplicación se beneficie de este fetch reciente.
    public async Task<JiraTicketInfo> ObtenerTicketForzadoAsync(string clave)
    {
        var cfg = await ObtenerConfiguracionAsync();
        if (cfg is null) throw new JiraNoConfiguradoException();

        var info = await ObtenerTicketDesdeJiraAsync(cfg, clave);
        await GuardarEnCacheAsync(clave, info);
        await _db.SaveChangesAsync();
        return info;
    }

    // Fetch con caché (TTL), para etiquetas "ambiente" en tablas/tableros: nunca lanza
    // si Jira no está configurado o un ticket concreto falla, simplemente lo omite (o
    // sirve el último valor conocido marcado como no confirmado).
    public async Task<List<JiraTicketInfo>> ObtenerTicketsConCacheAsync(IEnumerable<string> claves)
    {
        var claveList = claves.Where(c => !string.IsNullOrWhiteSpace(c)).Distinct().ToList();
        if (claveList.Count == 0) return new List<JiraTicketInfo>();

        var cacheados = await _db.JiraTicketsCache.Where(c => claveList.Contains(c.Clave)).ToListAsync();
        var cacheDict = cacheados.ToDictionary(c => c.Clave);

        var resultados = new Dictionary<string, JiraTicketInfo>();
        foreach (var c in cacheados) resultados[c.Clave] = MapCacheAInfo(c);

        var aRefrescar = claveList.Where(k => !cacheDict.TryGetValue(k, out var c) || DateTime.UtcNow - c.UltimaConsulta >= CacheTtl).ToList();
        if (aRefrescar.Count > 0)
        {
            var cfg = await ObtenerConfiguracionAsync();
            if (cfg is not null)
            {
                // Solo el fetch HTTP se hace en paralelo; el DbContext no es seguro para
                // concurrencia, así que el volcado a caché se hace después, en secuencia.
                var fetches = aRefrescar.Select(async clave =>
                {
                    try { return (Clave: clave, Info: await ObtenerTicketDesdeJiraAsync(cfg, clave), Ok: true); }
                    catch { return (Clave: clave, Info: (JiraTicketInfo?)null, Ok: false); }
                });
                var completados = await Task.WhenAll(fetches);

                foreach (var (clave, info, ok) in completados)
                {
                    if (ok && info is not null)
                    {
                        resultados[clave] = info;
                        await GuardarEnCacheAsync(clave, info);
                    }
                    else if (cacheDict.TryGetValue(clave, out var c))
                    {
                        c.Error = true;
                        resultados[clave] = MapCacheAInfo(c);
                    }
                }
                await _db.SaveChangesAsync();
            }
        }

        return claveList.Where(resultados.ContainsKey).Select(k => resultados[k]).ToList();
    }

    // Todos los tickets de un espacio Jira (clave de proyecto), en directo: se usa en la
    // pestaña "Jira" de la ficha de proyecto, que el usuario abre explícitamente.
    public async Task<List<JiraTicketInfo>> BuscarTicketsDeProyectoAsync(string claveProyecto, bool soloAbiertos, int maxResultados = 50)
    {
        var cfg = await ObtenerConfiguracionAsync();
        if (cfg is null) throw new JiraNoConfiguradoException();

        var (url, auth) = PrepararConexion(cfg);

        // Sin comillas: la clave del proyecto es un identificador JQL válido tal cual.
        // Entre comillas, Jira la trata como una cadena literal y la intenta resolver
        // contra el NOMBRE del proyecto, no contra su clave, y no encuentra nada.
        var jql = soloAbiertos
            ? $"project = {claveProyecto} AND statusCategory != Done ORDER BY updated DESC"
            : $"project = {claveProyecto} ORDER BY updated DESC";

        // Atlassian retiró el endpoint clásico GET /rest/api/3/search (ahora devuelve 410
        // Gone en los sites ya migrados); el reemplazo es POST /rest/api/3/search/jql.
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/api/3/search/jql")
        {
            Content = JsonContent.Create(new { jql, maxResults = maxResultados, fields = new[] { "summary", "status", "assignee", "updated" } }),
        };
        request.Headers.Authorization = auth;
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var response = await _http.SendAsync(request);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new JiraApiException("Las credenciales de Jira guardadas no son válidas.");
        if (!response.IsSuccessStatusCode)
            throw new JiraApiException($"Jira respondió con error {(int)response.StatusCode} al buscar el proyecto {claveProyecto}.");

        using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);

        var resultado = new List<JiraTicketInfo>();
        if (!json.RootElement.TryGetProperty("issues", out var issues)) return resultado;

        foreach (var issue in issues.EnumerateArray())
        {
            var clave = issue.GetProperty("key").GetString() ?? string.Empty;
            resultado.Add(MapearIssue(url, clave, issue.GetProperty("fields")));
        }
        return resultado;
    }

    private async Task<JiraTicketInfo> ObtenerTicketDesdeJiraAsync(JiraConfiguracion cfg, string clave)
    {
        var (url, auth) = PrepararConexion(cfg);
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/api/3/issue/{clave}?fields=summary,status,assignee,updated");
        request.Headers.Authorization = auth;
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var response = await _http.SendAsync(request);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new JiraApiException($"No se ha encontrado el ticket {clave} en Jira.");
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new JiraApiException("Las credenciales de Jira guardadas no son válidas.");
        if (!response.IsSuccessStatusCode)
            throw new JiraApiException($"Jira respondió con error {(int)response.StatusCode}.");

        using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);
        return MapearIssue(url, clave, json.RootElement.GetProperty("fields"));
    }

    private static JiraTicketInfo MapearIssue(string baseUrl, string clave, JsonElement fields)
    {
        var resumen = fields.TryGetProperty("summary", out var s) ? s.GetString() ?? string.Empty : string.Empty;
        var estado = fields.TryGetProperty("status", out var st) && st.TryGetProperty("name", out var stName) ? stName.GetString() ?? string.Empty : string.Empty;
        string? asignado = null;
        if (fields.TryGetProperty("assignee", out var asignee) && asignee.ValueKind != JsonValueKind.Null && asignee.TryGetProperty("displayName", out var dn))
            asignado = dn.GetString();
        DateTime? actualizado = fields.TryGetProperty("updated", out var upd) && upd.ValueKind == JsonValueKind.String && DateTime.TryParse(upd.GetString(), out var fecha)
            ? fecha.ToUniversalTime()
            : null;

        return new JiraTicketInfo(clave, resumen, estado, asignado, actualizado, $"{baseUrl}/browse/{clave}");
    }

    private async Task GuardarEnCacheAsync(string clave, JiraTicketInfo info)
    {
        var existente = await _db.JiraTicketsCache.FindAsync(clave);
        if (existente is null)
        {
            _db.JiraTicketsCache.Add(new JiraTicketCache
            {
                Clave = clave,
                Resumen = info.Resumen,
                Estado = info.Estado,
                AsignadoNombre = info.AsignadoNombre,
                ActualizadoJira = info.Actualizado,
                Url = info.Url,
                UltimaConsulta = DateTime.UtcNow,
                Error = false,
            });
        }
        else
        {
            existente.Resumen = info.Resumen;
            existente.Estado = info.Estado;
            existente.AsignadoNombre = info.AsignadoNombre;
            existente.ActualizadoJira = info.Actualizado;
            existente.Url = info.Url;
            existente.UltimaConsulta = DateTime.UtcNow;
            existente.Error = false;
        }
    }

    private static JiraTicketInfo MapCacheAInfo(JiraTicketCache c) =>
        new(c.Clave, c.Resumen, c.Estado, c.AsignadoNombre, c.ActualizadoJira, c.Url);
}

public record JiraTicketInfo(string Clave, string Resumen, string Estado, string? AsignadoNombre, DateTime? Actualizado, string Url);
