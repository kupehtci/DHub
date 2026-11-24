namespace Panorama.Domain.Enums;

public enum EstadoPersona
{
    Activo,
    Vacaciones,
    BajaTemporal,
    Inactivo
}

public enum EstadoEquipo
{
    Activo,
    Inactivo
}

public enum EstadoProyecto
{
    Planificado,
    EnCurso,
    EnPausa,
    Cerrado,
    Cancelado
}

public enum Prioridad
{
    Baja,
    Media,
    Alta,
    Critica
}

public enum TipoTarea
{
    HistoriaUsuario,
    Bug,
    Tarea,
    Mejora,
    Soporte
}

public enum EstadoTarea
{
    Backlog,
    Planificada,
    EnCurso,
    EnRevision,
    Bloqueada,
    Hecha,
    Cancelada
}

public enum EstadoHito
{
    Pendiente,
    EnRiesgo,
    Completado,
    Retrasado
}

public enum ImpactoRiesgo
{
    Bajo,
    Medio,
    Alto,
    Critico
}

public enum ProbabilidadRiesgo
{
    Baja,
    Media,
    Alta
}

public enum EstadoRiesgo
{
    Identificado,
    EnMitigacion,
    Mitigado,
    Materializado,
    Cerrado
}

public enum TipoNota
{
    Seguimiento,
    Decision,
    Riesgo,
    Bloqueo,
    General,
    Comentario
}

public enum TipoEvento
{
    Reunion = 0,
    Entrega = 1,
    // El valor 2 era "Hito": los hitos son ahora solo entidades de proyecto (tabla Hitos).
    // Se mantiene el número de Otro para no alterar los datos ya guardados.
    Otro = 3
}

public enum AmbitoFestivo
{
    Nacional,
    Autonomico,
    Local,
    Otro
}
