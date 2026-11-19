namespace DHub.Domain.Entities;

// Entidades con fecha de creación y de última modificación (en UTC). Las rellena
// automáticamente AppDbContext al guardar, sin que los controllers tengan que hacerlo.
public interface IAuditable
{
    DateTime CreadoEn { get; set; }
    DateTime ActualizadoEn { get; set; }
}
