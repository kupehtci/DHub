namespace DHub.Api.Dtos;

public record JiraEspacioDto(Guid Id, string Nombre, string Clave);

public record JiraConfiguracionDto(
    bool Configurado,
    string? BaseUrl,
    string? Email,
    string? TokenEnmascarado,
    DateTime? FechaActualizacion
);

// ApiToken: si se deja en blanco al actualizar, se conserva el token ya guardado
// (así no hay que volver a pegarlo cada vez que se cambia la URL o el email).
public record JiraConfiguracionUpdateDto(string BaseUrl, string Email, string? ApiToken);

public record JiraProbarConexionDto(string BaseUrl, string Email, string ApiToken);

public record JiraProbarConexionResultadoDto(bool Ok, string Mensaje);

public record JiraTicketsLoteDto(List<string> Claves);

public record JiraTicketInfoDto(
    string Clave,
    string Resumen,
    string Estado,
    string? AsignadoNombre,
    DateTime? Actualizado,
    string Url
);
