import { Label, ListBox, Select } from "@heroui/react";
import type { SelectOption } from "./SelectField";

export function MultiSelectField({
  label,
  values,
  onChange,
  options,
  placeholder = "Selecciona una o varias opciones",
  fullWidth = true,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}) {
  return (
    <Select
      fullWidth={fullWidth}
      placeholder={placeholder}
      selectionMode="multiple"
      value={values}
      onChange={(keys) => onChange((Array.isArray(keys) ? keys : []).map(String))}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox selectionMode="multiple">
          {options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
