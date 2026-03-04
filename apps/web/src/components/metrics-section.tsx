import * as React from "react"
import { Check, ChevronsUpDown, Plus, Trash } from "lucide-react"
import { useReportConfig, useReportActions, type Metric, type OperationType } from "@/contexts/report-builder-context"
import { useTableDetails } from "@/hooks/use-table-details"
import { flattenSchema } from "@/lib/report-utils"
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

const NONE_VALUE = "__none__"

const OPERATIONS: { value: OperationType; label: string }[] = [
  { value: "sum",            label: "SUM"            },
  { value: "avg",            label: "AVG"            },
  { value: "count",          label: "COUNT"          },
  { value: "count_distinct", label: "COUNT DISTINCT" },
  { value: "min",            label: "MIN"            },
  { value: "max",            label: "MAX"            },
]

const NUMERIC_TYPES = new Set([
  "INTEGER", "INT64", "FLOAT", "FLOAT64",
  "NUMERIC", "BIGNUMERIC", "INT", "SMALLINT", "BIGINT", "TINYINT", "BYTEINT",
])

const DATE_TYPES = new Set(["DATE", "DATETIME", "TIMESTAMP", "TIMESTAMP_NTZ"])

function defaultOperation(fieldType: string): OperationType {
  return NUMERIC_TYPES.has(fieldType.toUpperCase()) ? "sum" : "count"
}

function availableOperations(fieldType: string) {
  if (!fieldType) return OPERATIONS
  const type = fieldType.toUpperCase()
  if (NUMERIC_TYPES.has(type)) return OPERATIONS
  if (DATE_TYPES.has(type) || type === "STRING") {
    return OPERATIONS.filter((o) => ["count", "count_distinct", "min", "max"].includes(o.value))
  }
  return OPERATIONS.filter((o) => ["count", "count_distinct"].includes(o.value))
}

interface SchemaField { name: string; type: string }

interface MetricRowProps {
  metric: Metric
  schema: SchemaField[] | undefined
  disabled: boolean
  isLoadingColumns: boolean
  onUpdate: (updates: Partial<Omit<Metric, "id">>) => void
  onRemove: () => void
}

function MetricRow({ metric, schema, disabled, isLoadingColumns, onUpdate, onRemove }: MetricRowProps) {
  const [opOpen, setOpOpen] = React.useState(false)
  const [colOpen, setColOpen] = React.useState(false)

  const fieldType = schema?.find((f) => f.name === metric.column)?.type ?? ""
  const ops = availableOperations(fieldType)

  function handleSelectColumn(column: string | null) {
    if (column === null) {
      onRemove()
    } else {
      const ft = schema?.find((f) => f.name === column)?.type ?? ""
      onUpdate({ column, operation: defaultOperation(ft) })
    }
    setColOpen(false)
  }

  return (
    <div className="flex gap-2">
      {/* Operation picker */}
      <Popover open={opOpen} onOpenChange={setOpOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-32 shrink-0 justify-between font-normal"
          >
            <span className="truncate">{OPERATIONS.find((o) => o.value === metric.operation)?.label ?? "COUNT"}</span>
            <ChevronsUpDown className="ml-1 size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup>
                {ops.map((op) => (
                  <CommandItem
                    key={op.value}
                    value={op.value}
                    onSelect={() => { onUpdate({ operation: op.value }); setOpOpen(false) }}
                  >
                    <Check className={cn("size-4", metric.operation === op.value ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono font-medium">{op.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Column picker */}
      <Popover open={colOpen} onOpenChange={setColOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled || isLoadingColumns}
            className="min-w-0 flex-1 justify-between font-normal"
          >
            <span className="truncate">{metric.column ?? "Column…"}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search columns…" />
            <CommandList>
              <CommandEmpty>No columns found.</CommandEmpty>
              <CommandGroup>
                <CommandItem value={NONE_VALUE} onSelect={() => handleSelectColumn(null)}>
                  <Check className={cn("size-4", metric.column === null ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">None</span>
                </CommandItem>
                {schema?.map((field) => (
                  <CommandItem
                    key={field.name}
                    value={field.name}
                    onSelect={() => handleSelectColumn(field.name)}
                  >
                    <Check className={cn("size-4", metric.column === field.name ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{field.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground border"
        onClick={onRemove}
      >
        <Trash className="size-4" />
      </Button>
    </div>
  )
}

export function MetricsSection() {
  const { dataSource, metrics } = useReportConfig()
  const actions = useReportActions()

  const { data: tableDetails, isLoading: isLoadingColumns } = useTableDetails(
    dataSource?.datasetId ?? "",
    dataSource?.tableId ?? "",
  )

  const schema = flattenSchema(tableDetails?.schema ?? [])

  return (
    <div className="px-4 py-3">
      <div className="rounded-xl border p-3">
        <p className="mb-2 text-xs text-muted-foreground">Metrics</p>

        {metrics.map((metric, index) => (
          <div key={metric.id} className={cn(index > 0 && "mt-2")}>
            <MetricRow
              metric={metric}
              schema={schema}
              disabled={!dataSource}
              isLoadingColumns={isLoadingColumns}
              onUpdate={(updates) => actions.updateMetric(metric.id, updates)}
              onRemove={() => actions.removeMetric(metric.id)}
            />
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          disabled={!dataSource}
          className="mt-2 w-full justify-start text-muted-foreground"
          onClick={() => actions.addMetric({ id: crypto.randomUUID(), operation: "count", column: null })}
        >
          <Plus className="mr-1 size-4" />
          Add metric
        </Button>
      </div>
    </div>
  )
}
