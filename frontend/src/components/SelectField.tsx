import { Label, ListBox, Select } from "@heroui/react";

export interface SelectOption {
  id: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecciona una opción",
  emptyOption,
  isRequired,
  fullWidth = true,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyOption?: string;
  isRequired?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Select
      fullWidth={fullWidth}
      isRequired={isRequired}
      placeholder={placeholder}
      value={value ?? null}
      onChange={(key) => {
        const str = key ? String(key) : null;
        onChange(str === "__none__" ? null : str);
      }}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {emptyOption ? (
            <ListBox.Item id="__none__" textValue={emptyOption}>
              {emptyOption}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ) : null}
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
