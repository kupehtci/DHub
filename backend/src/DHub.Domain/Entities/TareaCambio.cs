namespace DHub.Domain.Entities;

// Entrada del historial de una tarea: qué campo cambió, de qué valor a cuál, cuándo y quién.
// Los valores se guardan como texto ya legible (nombres de persona y códigos de proyecto en
// lugar de identificadores), salvo los enumerados (estado, prioridad), que se guardan por su
// nombre para poder reconstruir la línea temporal de estados en las analíticas.
public class TareaCambio
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TareaId { get; set; }
    public Tarea? Tarea { get; set; }

    public DateTime Fecha { get; set; }
    public string Usuario { get; set; } = string.Empty;

    // Nombre de la propiedad cambiada ("Estado", "ResponsableId"...) o "Creada" al crear la tarea.
    public string Campo { get; set; } = string.Empty;
    public string? ValorAnterior { get; set; }
    public string? ValorNuevo { get; set; }
}
