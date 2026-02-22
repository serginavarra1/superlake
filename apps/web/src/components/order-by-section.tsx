import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useReportConfig, useReportActions } from "@/contexts/report-builder-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const NONE_VALUE = "__none__"

export function OrderBySection() {
  const [open, setOpen] = React.useState(false)
  const { dimension, groupBy, metrics, orderBy } = useReportConfig()
  const { setOrderBy } = useReportActions()

  const options: { value: string; label: string }[] = [
    ...(dimension ? [{ value: "dimension", label: dimension }] : []),
    ...(groupBy ? [{ value: "group_by", label: groupBy }] : []),
    ...metrics
      .filter((m) => m.column !== null)
      .map((m) => ({ value: m.id, label: `${m.operation.toUpperCase()}(${m.column})` })),
  ]

  const label = orderBy
    ? (options.find((o) => o.value === orderBy.target)?.label ?? "None")
    : "None"

  return (
    <div className="px-4 py-3">
      <div className="rounded-xl border p-3">
        <p className="mb-2 text-xs text-muted-foreground">Order by</p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={options.length === 0}
              className="w-full justify-between font-normal"
            >
              <span className="truncate">{label}</span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No options available.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value={NONE_VALUE} onSelect={() => { setOrderBy(null); setOpen(false) }}>
                    <Check className={cn("size-4", !orderBy ? "opacity-100" : "opacity-0")} />
                    <span className="text-muted-foreground">None</span>
                  </CommandItem>
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      onSelect={() => {
                        setOrderBy({ target: opt.value, direction: orderBy?.direction ?? "asc" })
                        setOpen(false)
                      }}
                    >
                      <Check className={cn("size-4", orderBy?.target === opt.value ? "opacity-100" : "opacity-0")} />
                      <span>{opt.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {orderBy && (
          <div className="mt-2 flex gap-1">
            <Button
              variant={orderBy.direction === "asc" ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs border"
              onClick={() => setOrderBy({ ...orderBy, direction: "asc" })}
            >
              ASC
            </Button>
            <Button
              variant={orderBy.direction === "desc" ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs border"
              onClick={() => setOrderBy({ ...orderBy, direction: "desc" })}
            >
              DESC
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
