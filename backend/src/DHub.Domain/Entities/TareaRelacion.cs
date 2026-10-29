namespace DHub.Domain.Entities;

// Relación simétrica entre dos tareas (p. ej. "depende de", "relacionada con").
// Se guarda en ambos sentidos (origen->destino y destino->origen) para simplificar las
// consultas: basta con filtrar por TareaOrigenId para obtener todas las tareas relacionadas.
public class TareaRelacion
{
    public Guid TareaOrigenId { get; set; }
    public Tarea? TareaOrigen { get; set; }

    public Guid TareaDestinoId { get; set; }
    public Tarea? TareaDestino { get; set; }
}
