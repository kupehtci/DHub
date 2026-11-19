namespace DHub.Domain.Entities;

// Dependencia dirigida entre tareas: la predecesora bloquea a la sucesora, es decir, la
// sucesora no debería empezar antes de que termine la predecesora (fin → inicio).
// A diferencia de TareaRelacion (simétrica, solo informativa), aquí importa el sentido.
public class TareaDependencia
{
    public Guid PredecesoraId { get; set; }
    public Tarea? Predecesora { get; set; }

    public Guid SucesoraId { get; set; }
    public Tarea? Sucesora { get; set; }
}
