namespace DHub.Domain.Enums;

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
    Reunion,
    Entrega,
    Hito,
    Otro
}
