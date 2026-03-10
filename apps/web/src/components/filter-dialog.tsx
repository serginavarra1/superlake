import * as React from "react"
import {
  ALargeSmall,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  Hash,
  HelpCircle,
  X,
} from "lucide-react"
import {
  type FilterCondition,
  type FilterOperator,
  type ReportFilter,
} from "@/contexts/report-builder-context"
import { useReportConfig } from "@/contexts/report-builder-context"
import { useTableDetails } from "@/hooks/use-table"
import { useDistinctColumnValues } from "@/hooks/use-distinct-column-values"
import { flattenSchema } from "@/lib/report-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ─── Type helpers ────────────────────────────────────────────────────────────

interface SchemaField {
  name: string
  type: string
}

const NUMERIC_TYPES = new Set([
  "INTEGER", "INT64", "FLOAT", "FLOAT64",
  "NUMERIC", "BIGNUMERIC", "INT", "SMALLINT", "BIGINT", "TINYINT", "BYTEINT",
])

const DATE_TYPES = new Set(["DATE", "DATETIME", "TIMESTAMP", "TIMESTAMP_NTZ"])

function columnKind(type: string): "numeric" | "date" | "string" | "unknown" {
  const t = type.toUpperCase()
  if (NUMERIC_TYPES.has(t)) return "numeric"
  if (DATE_TYPES.has(t)) return "date"
  if (t === "STRING" || t === "BYTES") return "string"
  return "unknown"
}

function ColumnIcon({ type, className }: { type: string; className?: string }) {
  const kind = columnKind(type)
  const cls = cn("size-3.5 shrink-0 text-muted-foreground", className)
  if (kind === "numeric") return <Hash className={cls} />
  if (kind === "date") return <CalendarIcon className={cls} />
  if (kind === "string") return <ALargeSmall className={cls} />
  return <HelpCircle className={cls} />
}

type OperatorDef = { value: FilterOperator; label: string }

const ALL_OPERATORS: OperatorDef[] = [
  { value: "equals",               label: "Equals" },
  { value: "not_equals",           label: "Not equals" },
  { value: "contains",             label: "Contains" },
  { value: "not_contains",         label: "Does not contain" },
  { value: "starts_with",          label: "Starts with" },
  { value: "ends_with",            label: "Ends with" },
  { value: "greater_than",         label: "Greater than" },
  { value: "less_than",            label: "Less than" },
  { value: "greater_than_or_equal", label: "Greater than or equal" },
  { value: "less_than_or_equal",   label: "Less than or equal" },
  { value: "in",                   label: "In list" },
  { value: "not_in",               label: "Not in list" },
  { value: "is_null",              label: "Is null" },
  { value: "is_not_null",          label: "Is not null" },
]

function operatorsForKind(kind: ReturnType<typeof columnKind>): OperatorDef[] {
  if (kind === "numeric") {
    return ALL_OPERATORS.filter((o) =>
      ["equals","not_equals","greater_than","less_than","greater_than_or_equal","less_than_or_equal","in","not_in","is_null","is_not_null"].includes(o.value)
    )
  }
  if (kind === "date") {
    return ALL_OPERATORS.filter((o) =>
      ["equals","not_equals","greater_than","less_than","greater_than_or_equal","less_than_or_equal","is_null","is_not_null"].includes(o.value)
    )
  }
  if (kind === "string") {
    return ALL_OPERATORS.filter((o) =>
      ["equals","not_equals","contains","not_contains","starts_with","ends_with","in","not_in","is_null","is_not_null"].includes(o.value)
    )
  }
  return ALL_OPERATORS.filter((o) => ["equals","not_equals","is_null","is_not_null"].includes(o.value))
}

// ─── Condition helpers ────────────────────────────────────────────────────────

function emptyCondition(): FilterCondition {
  return { id: crypto.randomUUID(), column: null, operator: null, value: null }
}

function emptyFilter(): ReportFilter {
  return { id: crypto.randomUUID(), name: "", condition: emptyCondition() }
}

function generateFilterName(condition: FilterCondition): string {
  if (!condition.column) return ""
  const operatorLabel = ALL_OPERATORS.find((o) => o.value === condition.operator)?.label
  if (!operatorLabel) return condition.column
  const isNullOp = condition.operator === "is_null" || condition.operator === "is_not_null"
  if (isNullOp) return `${condition.column} ${operatorLabel}`
  if (!condition.value) return `${condition.column} ${operatorLabel}`
  if (Array.isArray(condition.value)) {
    return `${condition.column} ${operatorLabel} ${condition.value.join(", ")}`
  }
  return `${condition.column} ${operatorLabel} ${condition.value}`
}

// ─── Sub-pickers ─────────────────────────────────────────────────────────────

function ColumnPickerInline({
  schema,
  value,
  onChange,
}: {
  schema: SchemaField[] | undefined
  value: string | null
  onChange: (col: string | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const field = schema?.find((f) => f.name === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-0 flex-1 justify-between font-normal">
          <span className="flex items-center gap-1.5 truncate">
            {field ? <ColumnIcon type={field.type} /> : null}
            <span className="truncate">{value ?? "Column…"}</span>
          </span>
          <ChevronsUpDown className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search column…" />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {schema?.map((f) => (
                <CommandItem key={f.name} value={f.name} onSelect={() => { onChange(f.name); setOpen(false) }}>
                  <Check className={cn("size-4", value === f.name ? "opacity-100" : "opacity-0")} />
                  <ColumnIcon type={f.type} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{f.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function OperatorPicker({
  kind,
  value,
  onChange,
}: {
  kind: ReturnType<typeof columnKind>
  value: FilterOperator | null
  onChange: (op: FilterOperator) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ops = operatorsForKind(kind)
  const label = ALL_OPERATORS.find((o) => o.value === value)?.label ?? "Operator…"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-36 justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {ops.map((op) => (
                <CommandItem key={op.value} value={op.value} onSelect={() => { onChange(op.value); setOpen(false) }}>
                  <Check className={cn("size-4", value === op.value ? "opacity-100" : "opacity-0")} />
                  {op.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Value inputs ─────────────────────────────────────────────────────────────

function DateValueInput({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  // Append T00:00:00 (no Z) so the string is parsed as local time, not UTC
  const selected = value ? new Date(value + "T00:00:00") : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-0 flex-1 justify-start font-normal">
          <CalendarIcon className="mr-1.5 size-3.5 text-muted-foreground" />
          <span className="truncate">{value ?? "Date…"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (day) {
              // Use local date parts instead of toISOString() (which converts to UTC)
              const yyyy = day.getFullYear()
              const mm = String(day.getMonth() + 1).padStart(2, "0")
              const dd = String(day.getDate()).padStart(2, "0")
              onChange(`${yyyy}-${mm}-${dd}`)
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function AutocompleteValueInput({
  value,
  distinctValues,
  onChange,
}: {
  value: string | null
  distinctValues: (string | number | null)[] | undefined
  onChange: (v: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [inputVal, setInputVal] = React.useState(value ?? "")

  // Sync when condition resets
  React.useEffect(() => { setInputVal(value ?? "") }, [value])

  const filtered = React.useMemo(() => {
    if (!distinctValues) return []
    const q = inputVal.toLowerCase()
    return distinctValues
      .filter((v) => v !== null && String(v).toLowerCase().includes(q))
      .slice(0, 50)
  }, [distinctValues, inputVal])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="min-w-0 flex-1">
          <Input
            value={inputVal}
            placeholder="Value…"
            className="h-8 text-sm"
            onChange={(e) => {
              setInputVal(e.target.value)
              onChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
          />
        </div>
      </PopoverTrigger>
      {filtered.length > 0 && (
        <PopoverContent
          className="w-64 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandGroup>
                {filtered.map((v, i) => (
                  <CommandItem
                    key={i}
                    value={String(v)}
                    onSelect={(selected) => {
                      setInputVal(selected)
                      onChange(selected)
                      setOpen(false)
                    }}
                  >
                    {String(v)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  )
}

function MultiSelectValueInput({
  value,
  distinctValues,
  onChange,
}: {
  value: string[]
  distinctValues: (string | number | null)[] | undefined
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)

  const options = React.useMemo(
    () => (distinctValues ?? []).filter((v) => v !== null).map(String),
    [distinctValues],
  )

  function toggle(item: string) {
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item])
  }

  return (
    <div className="min-w-0 flex-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-auto min-h-8 w-full justify-start font-normal"
          >
            {value.length === 0 ? (
              <span className="text-muted-foreground">Select values…</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {value.map((v) => (
                  <span
                    key={v}
                    className="flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-xs"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggle(v) }}
                      className="ml-0.5 rounded-full hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)}>
                    <Check className={cn("size-4", value.includes(opt) ? "opacity-100" : "opacity-0")} />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─── ConditionRow ─────────────────────────────────────────────────────────────

interface ConditionRowProps {
  condition: FilterCondition
  schema: SchemaField[] | undefined
  datasetId: string | null
  tableId: string | null
  onUpdate: (updates: Partial<Omit<FilterCondition, "id">>) => void
}

function ConditionRow({ condition, schema, datasetId, tableId, onUpdate }: ConditionRowProps) {
  const fieldType = schema?.find((f) => f.name === condition.column)?.type ?? ""
  const kind = fieldType ? columnKind(fieldType) : "unknown"

  const { data: distinctValues } = useDistinctColumnValues(datasetId, tableId, condition.column)

  const isNullOp = condition.operator === "is_null" || condition.operator === "is_not_null"
  const isMultiOp = condition.operator === "in" || condition.operator === "not_in"
  const isDateCol = kind === "date"

  function handleColumnChange(col: string | null) {
    onUpdate({ column: col, operator: null, value: null })
  }

  function handleOperatorChange(op: FilterOperator) {
    const wasMulti = condition.operator === "in" || condition.operator === "not_in"
    const isNewMulti = op === "in" || op === "not_in"
    const willHide = op === "is_null" || op === "is_not_null"
    onUpdate({
      operator: op,
      value: willHide ? null : (wasMulti !== isNewMulti ? null : condition.value),
    })
  }

  function handleValueChange(v: string | string[] | null) {
    onUpdate({ value: v })
  }

  return (
    <div className="flex flex-wrap items-start gap-1.5">
      <ColumnPickerInline
        schema={schema}
        value={condition.column}
        onChange={handleColumnChange}
      />
      <OperatorPicker
        kind={kind}
        value={condition.operator}
        onChange={handleOperatorChange}
      />
      {!isNullOp && condition.column && (
        isMultiOp ? (
          <MultiSelectValueInput
            value={Array.isArray(condition.value) ? condition.value : []}
            distinctValues={distinctValues}
            onChange={(v) => handleValueChange(v)}
          />
        ) : isDateCol ? (
          <DateValueInput
            value={typeof condition.value === "string" ? condition.value : null}
            onChange={(v) => handleValueChange(v)}
          />
        ) : (
          <AutocompleteValueInput
            value={typeof condition.value === "string" ? condition.value : null}
            distinctValues={distinctValues}
            onChange={(v) => handleValueChange(v)}
          />
        )
      )}
    </div>
  )
}

// ─── FilterDialog ─────────────────────────────────────────────────────────────

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFilter?: ReportFilter
  onSave: (filter: ReportFilter) => void
}

export function FilterDialog({ open, onOpenChange, initialFilter, onSave }: FilterDialogProps) {
  const { dataSource } = useReportConfig()
  const { data: tableDetails } = useTableDetails(
    dataSource?.datasetId ?? "",
    dataSource?.tableId ?? "",
  )
  const schema = flattenSchema(tableDetails?.schema ?? []) as SchemaField[] | undefined

  const [draft, setDraft] = React.useState<ReportFilter>(emptyFilter)
  const nameManuallyEdited = React.useRef(false)

  // Reset draft whenever the dialog opens
  React.useEffect(() => {
    if (open) {
      nameManuallyEdited.current = false
      setDraft(initialFilter ? JSON.parse(JSON.stringify(initialFilter)) : emptyFilter())
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateCondition(updates: Partial<Omit<FilterCondition, "id">>) {
    setDraft((d) => {
      const newCondition = { ...d.condition, ...updates }
      const name = nameManuallyEdited.current ? d.name : generateFilterName(newCondition)
      return { ...d, condition: newCondition, name }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-4">
        <DialogHeader>
          <DialogTitle>{initialFilter ? "Edit filter" : "New filter"}</DialogTitle>
        </DialogHeader>

        {/* Filter name */}
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Name</p>
          <Input
            placeholder="Filter name…"
            value={draft.name}
            onChange={(e) => {
              nameManuallyEdited.current = true
              setDraft((d) => ({ ...d, name: e.target.value }))
            }}
          />
        </div>

        {/* Condition */}
        <ConditionRow
          condition={draft.condition}
          schema={schema}
          datasetId={dataSource?.datasetId ?? null}
          tableId={dataSource?.tableId ?? null}
          onUpdate={updateCondition}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave(draft)}
            disabled={!draft.name.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
