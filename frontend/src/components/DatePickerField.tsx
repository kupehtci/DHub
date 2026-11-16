import { Calendar, DateField, DatePicker, Description, I18nProvider, Label } from "@heroui/react";
import { parseDate } from "@internationalized/date";

// Selector de una fecha con calendario desplegable (HeroUI), en español y con la semana
// empezando en lunes. Trabaja con cadenas ISO "YYYY-MM-DD" ("" = sin fecha).
export function DatePickerField({
  label,
  value,
  onChange,
  isRequired,
  isDisabled,
  description,
  clearable = !isRequired,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  description?: string;
  clearable?: boolean;
}) {
  return (
    <I18nProvider locale="es-ES">
      <DatePicker
        className="w-full"
        isRequired={isRequired}
        isDisabled={isDisabled}
        value={value ? parseDate(value) : null}
        onChange={(d) => onChange(d ? d.toString() : "")}
      >
        <Label>{label}</Label>
        <DateField.Group fullWidth>
          <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateField.Suffix>
            {clearable && value && !isDisabled ? (
              <button type="button" aria-label={`Quitar ${label.toLowerCase()}`} className="px-1 text-muted hover:text-danger" onClick={() => onChange("")}>
                ×
              </button>
            ) : null}
            <DatePicker.Trigger>
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        {description ? <Description>{description}</Description> : null}
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
    </I18nProvider>
  );
}
