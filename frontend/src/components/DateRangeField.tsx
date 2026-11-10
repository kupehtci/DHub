import { DateField, DateRangePicker, Description, I18nProvider, Label, RangeCalendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const fmt = (iso: string) => format(new Date(`${iso}T00:00:00`), "d MMM yyyy", { locale: es });

// Selector de rango de fechas (inicio → fin) con un calendario desplegable en el que
// se eligen ambas fechas seguidas. Trabaja con cadenas ISO "YYYY-MM-DD" ("" = sin fecha).
export function DateRangeField({
  label,
  start,
  end,
  onChange,
  description,
}: {
  label: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  description?: string;
}) {
  const value = start && end ? { start: parseDate(start), end: parseDate(end) } : null;
  // Tareas antiguas pueden tener solo una de las dos fechas: se avisa para no ocultarla.
  const parcial = !value && (start || end);

  return (
    <I18nProvider locale="es-ES">
      <DateRangePicker
        className="w-full"
        value={value}
        onChange={(r) => onChange(r ? r.start.toString() : "", r ? r.end.toString() : "")}
      >
        <Label>{label}</Label>
        <DateField.Group fullWidth>
          <DateField.Input slot="start">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateRangePicker.RangeSeparator />
          <DateField.Input slot="end">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateField.Suffix>
            {start || end ? (
              <button
                type="button"
                aria-label="Quitar fechas"
                className="px-1 text-muted hover:text-danger"
                onClick={() => onChange("", "")}
              >
                ×
              </button>
            ) : null}
            <DateRangePicker.Trigger>
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        {parcial ? (
          <Description>
            Ahora mismo: {start ? `inicio ${fmt(start)}` : "sin inicio"} · {end ? `fin ${fmt(end)}` : "sin fin"}. Elige el rango completo en el calendario.
          </Description>
        ) : description ? (
          <Description>{description}</Description>
        ) : null}
        <DateRangePicker.Popover>
          <RangeCalendar aria-label={label}>
            <RangeCalendar.Header>
              <RangeCalendar.NavButton slot="previous" />
              <RangeCalendar.Heading />
              <RangeCalendar.NavButton slot="next" />
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}</RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
            </RangeCalendar.Grid>
          </RangeCalendar>
        </DateRangePicker.Popover>
      </DateRangePicker>
    </I18nProvider>
  );
}
