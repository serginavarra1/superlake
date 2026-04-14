import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Sentinel value for the "None" option in Command lists. Must not collide with real column names.
export const NONE_VALUE = "__none__"

export interface SchemaField {
  name: string
  type: string
}

interface ColumnPickerProps {
  schema: SchemaField[] | undefined
  value: string | null
  onSelect: (column: string | null) => void
  disabled?: boolean
  placeholder?: string
  triggerClassName?: string
}

export function ColumnPicker({
  schema,
  value,
  onSelect,
  disabled,
  placeholder = "Select a column…",
  triggerClassName,
}: ColumnPickerProps) {
  const [open, setOpen] = React.useState(false)

  function handleSelect(column: string | null) {
    onSelect(column)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", triggerClassName)}
        >
          <span className="truncate">{value ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search columns…" />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={NONE_VALUE} onSelect={() => handleSelect(null)}>
                <Check className={cn("size-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">None</span>
              </CommandItem>
              {schema?.map((field) => (
                <CommandItem
                  key={field.name}
                  value={field.name}
                  onSelect={() => handleSelect(field.name)}
                >
                  <Check className={cn("size-4", value === field.name ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{field.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
