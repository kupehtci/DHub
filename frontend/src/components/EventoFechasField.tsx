import { Calendar, DateField, DatePicker, I18nProvider, Label, TimeField } from "@heroui/react";
import { parseDate, parseTime } from "@internationalized/date";
import { addMinutes, differenceInMinutes, format } from "date-fns";

// Valores en formato local "YYYY-MM-DDTHH:mm" ("" = sin valor), como los de <input type="datetime-local">.
const separar = (v: string) => (v ? { fecha: v.slice(0, 10), hora: v.slice(11, 16) } : { fecha: "", hora: "" });
const unir = (fecha: string, hora: string) => (fecha ? `${fecha}T${hora || "00:00"}` : "");
const aDate = (v: string) => new Date(v);
const aLocal = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

const DURACIONES: { etiqueta: string; minutos: number }[] = [
  { etiqueta: "30 min", minutos: 30 },
  { etiqueta: "1 h", minutos: 60 },
  { etiqueta: "1 h 30", minutos: 90 },
  { etiqueta: "2 h", minutos: 120 },
  { etiqueta: "4 h", minutos: 240 },
];

function FechaPicker({ label, value, onChange, isRequired }: { label: string; value: string; onChange: (v: string) => void; isRequired?: boolean }) {
  return (
    <DatePicker className="w-full" isRequired={isRequired} value={value ? parseDate(value) : null} onChange={(d) => onChange(d ? d.toString() : "")}>
      <Label>{label}</Label>
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.NavButton slot="previous" />
            <Calendar.Heading />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}

function HoraField({ label, value, onChange, isDisabled }: { label: string; value: string; onChange: (v: string) => void; isDisabled?: boolean }) {
  return (
    <TimeField
      className="w-full"
      hourCycle={24}
      isDisabled={isDisabled}
      value={value ? parseTime(value) : null}
      onChange={(t) => onChange(t ? t.toString().slice(0, 5) : "")}
    >
      <Label>{label}</Label>
      <TimeField.Group fullWidth>
        <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
      </TimeField.Group>
    </TimeField>
  );
}

// Inicio y fin de un evento: fecha con calendario desplegable, hora en formato 24 h y
// accesos rápidos de duración. Al mover el inicio, el fin se desplaza con él.
export function EventoFechasField({ inicio, fin, onChange }: { inicio: string; fin: string; onChange: (inicio: string, fin: string) => void }) {
  const i = separar(inicio);
  const f = separar(fin);
  const duracion = inicio && fin ? differenceInMinutes(aDate(fin), aDate(inicio)) : null;

  const cambiarInicio = (nuevo: string) => {
    // Conserva la duración del evento si ya tenía fin.
    if (nuevo && duracion !== null && duracion >= 0) onChange(nuevo, aLocal(addMinutes(aDate(nuevo), duracion)));
    else onChange(nuevo, fin);
  };

  const cambiarFin = (fecha: string, hora: string) => {
    // Al poner solo la hora de fin, se asume el mismo día del inicio.
    const fechaFin = fecha || (hora ? i.fecha : "");
    onChange(inicio, unir(fechaFin, hora || (fechaFin ? i.hora : "")));
  };

  const finAntesDeInicio = duracion !== null && duracion < 0;

  return (
    <I18nProvider locale="es-ES">
      <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
          <FechaPicker isRequired label="Inicio" value={i.fecha} onChange={(d) => cambiarInicio(unir(d, i.hora || "09:00"))} />
          <HoraField isDisabled={!i.fecha} label="Hora" value={i.hora} onChange={(h) => cambiarInicio(unir(i.fecha, h))} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Duración:</span>
          {DURACIONES.map((d) => (
            <button
              key={d.minutos}
              type="button"
              disabled={!inicio}
              onClick={() => onChange(inicio, aLocal(addMinutes(aDate(inicio), d.minutos)))}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors disabled:opacity-50 ${
                duracion === d.minutos ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {d.etiqueta}
            </button>
          ))}
          {fin ? (
            <button type="button" onClick={() => onChange(inicio, "")} className="rounded-full px-2 py-0.5 text-xs text-muted hover:text-danger">
              Sin fin
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
          <FechaPicker label="Fin (opcional)" value={f.fecha} onChange={(d) => cambiarFin(d, f.hora)} />
          <HoraField isDisabled={!inicio} label="Hora" value={f.hora} onChange={(h) => cambiarFin(f.fecha, h)} />
        </div>
        {finAntesDeInicio ? <p className="text-xs text-danger">El fin es anterior al inicio.</p> : null}
      </div>
    </I18nProvider>
  );
}
