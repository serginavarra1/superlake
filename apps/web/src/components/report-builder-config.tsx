import * as React from "react"
import { Check, ChevronsUpDown, Plus, Trash } from "lucide-react"
import { useDatasets } from "@/hooks/use-datasets"
import { useTableDetails } from "@/hooks/use-table-details"
import { useReportConfig, useReportActions, type DimensionGranularity, type Metric, type OperationType } from "@/contexts/report-builder-context"
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
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

// Sentinel value for the "None" option in Command lists. Must not collide with real column names.
const NONE_VALUE = "__none__"

const OPERATIONS: { value: OperationType; label: string }[] = [
  { value: "sum",   label: "SUM"   },
  { value: "avg",   label: "AVG"   },
  { value: "count", label: "COUNT" },
  { value: "min",   label: "MIN"   },
  { value: "max",   label: "MAX"   },
]

const NUMERIC_TYPES = new Set([
  "INTEGER", "INT64", "FLOAT", "FLOAT64",
  "NUMERIC", "BIGNUMERIC", "INT", "SMALLINT", "BIGINT", "TINYINT", "BYTEINT",
])

const DATE_TYPES = new Set(["DATE", "DATETIME", "TIMESTAMP", "TIMESTAMP_NTZ"])

const GRANULARITIES: { value: DimensionGranularity; label: string }[] = [
  { value: "date",       label: "Date"  },
  { value: "month_year", label: "Month" },
  { value: "year",       label: "Year"  },
]

function defaultOperation(fieldType: string): OperationType {
  return NUMERIC_TYPES.has(fieldType.toUpperCase()) ? "sum" : "count"
}

function availableOperations(fieldType: string) {
  if (!fieldType) return OPERATIONS
  const type = fieldType.toUpperCase()
  if (NUMERIC_TYPES.has(type)) return OPERATIONS
  if (DATE_TYPES.has(type) || type === "STRING") {
    return OPERATIONS.filter((o) => ["count", "min", "max"].includes(o.value))
  }
  return OPERATIONS.filter((o) => o.value === "count")
}

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

interface SchemaField { name: string; type: string }

interface ColumnPickerProps {
  schema: SchemaField[] | undefined
  value: string | null
  onSelect: (column: string | null) => void
  disabled?: boolean
  placeholder?: string
  triggerClassName?: string
}

/** Generic column picker backed by a Command popover. */
function ColumnPicker({ schema, value, onSelect, disabled, placeholder = "Select a column…", triggerClassName }: ColumnPickerProps) {
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

interface GranularityPickerProps {
  value: DimensionGranularity | null
  onChange: (granularity: DimensionGranularity) => void
}

function GranularityPicker({ value, onChange }: GranularityPickerProps) {
  return (
    <div className="mt-2 flex gap-1">
      {GRANULARITIES.map((g) => (
        <Button
          key={g.value}
          variant={value === g.value ? "secondary" : "outline"}
          size="sm"
          className="flex-1 text-xs border"
          onClick={() => onChange(g.value)}
        >
          {g.label}
        </Button>
      ))}
    </div>
  )
}

interface MetricRowProps {
  metric: Metric
  schema: SchemaField[] | undefined
  disabled: boolean
  isLoadingColumns: boolean
  onUpdate: (updates: Partial<Omit<Metric, "id">>) => void
  /** Called when the metric should be removed (trash button or "None" column selection). */
  onRemove: () => void
}

function MetricRow({ metric, schema, disabled, isLoadingColumns, onUpdate, onRemove }: MetricRowProps) {
  const [opOpen, setOpOpen] = React.useState(false)
  const [colOpen, setColOpen] = React.useState(false)

  const fieldType = schema?.find((f) => f.name === metric.column)?.type ?? ""
  const ops = availableOperations(fieldType)

  function handleSelectColumn(column: string | null) {
    if (column === null) {
      // "None" in the column picker removes the metric row entirely.
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
            className="w-24 shrink-0 justify-between font-normal"
          >
            <span>{OPERATIONS.find((o) => o.value === metric.operation)?.label ?? "COUNT"}</span>
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReportBuilderConfig() {
  const [dataSourceOpen, setDataSourceOpen] = React.useState(false)
  const [orderByOpen, setOrderByOpen] = React.useState(false)

  const config = useReportConfig()
  const actions = useReportActions()
  const { dataSource, dimension, dimensionGranularity, groupBy, groupByGranularity, groupByIncludeEmpty, metrics, orderBy } = config

  const { data: datasets } = useDatasets()
  const { data: tableDetails, isLoading: isLoadingColumns } = useTableDetails(
    dataSource?.datasetId ?? "",
    dataSource?.tableId ?? "",
  )

  const schema = tableDetails?.schema

  function isDateColumn(columnName: string): boolean {
    const fieldType = schema?.find((f) => f.name === columnName)?.type ?? ""
    return DATE_TYPES.has(fieldType.toUpperCase())
  }

  const isDimDate = dimension ? isDateColumn(dimension) : false
  const isGroupByDate = groupBy ? isDateColumn(groupBy) : false

  const dataSourceLabel = dataSource ? (
    <span>{dataSource.datasetId} / <strong>{dataSource.tableId}</strong></span>
  ) : (
    "Select a table…"
  )

  const orderByOptions: { value: string; label: string }[] = [
    ...(dimension ? [{ value: "dimension", label: dimension }] : []),
    ...(groupBy ? [{ value: "group_by", label: groupBy }] : []),
    ...metrics
      .filter((m) => m.column !== null)
      .map((m) => ({ value: m.id, label: `${m.operation.toUpperCase()}(${m.column})` })),
  ]

  const orderByLabel = orderBy
    ? (orderByOptions.find((o) => o.value === orderBy.target)?.label ?? "None")
    : "None"

  return (
    <aside className="flex w-96 flex-col overflow-y-auto border-l bg-background">

      {/* Data source */}
      <div className="px-4 py-3">
        <p className="mb-2 text-xs text-muted-foreground">Data source</p>
        <Popover open={dataSourceOpen} onOpenChange={setDataSourceOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={dataSourceOpen}
              className="w-full justify-between font-normal"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">{dataSourceLabel}</span>
              </div>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tables…" />
              <CommandList>
                <CommandEmpty>No tables found.</CommandEmpty>
                {datasets?.map((dataset) => (
                  <CommandGroup key={dataset.datasetId} heading={dataset.datasetId}>
                    {dataset.tables.map((table) => (
                      <CommandItem
                        key={`${dataset.datasetId}·${table.tableId}`}
                        value={`${dataset.datasetId} ${table.tableId}`}
                        onSelect={() => {
                          actions.setDataSource({ datasetId: dataset.datasetId, tableId: table.tableId })
                          setDataSourceOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            dataSource?.datasetId === dataset.datasetId &&
                              dataSource?.tableId === table.tableId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {table.tableId}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="px-4 py-2">
        <Separator />
      </div>

      {/* Dimension (x-axis) */}
      <div className="px-4 py-3">
        <div className="rounded-xl border p-3">
          <p className="mb-2 text-xs text-muted-foreground">Dimension</p>
          <ColumnPicker
            schema={schema}
            value={dimension}
            disabled={!dataSource || isLoadingColumns}
            placeholder="Select a column…"
            triggerClassName="w-full"
            onSelect={(col) => {
              actions.setDimension(col)
              if (col && isDateColumn(col)) actions.setDimensionGranularity("date")
            }}
          />
          {isDimDate && (
            <GranularityPicker value={dimensionGranularity} onChange={actions.setDimensionGranularity} />
          )}

          <p className="mb-2 mt-3 text-xs text-muted-foreground">Group by</p>
          <ColumnPicker
            schema={schema}
            value={groupBy}
            disabled={!dataSource || !dimension || isLoadingColumns}
            placeholder="None"
            triggerClassName="w-full"
            onSelect={(col) => {
              actions.setGroupBy(col)
              if (col && isDateColumn(col)) actions.setGroupByGranularity("date")
            }}
          />
          {isGroupByDate && (
            <GranularityPicker value={groupByGranularity} onChange={actions.setGroupByGranularity} />
          )}

          {groupBy && (
            <div className="mt-3 flex items-center gap-2">
              <Switch
                id="group-by-include-empty"
                checked={groupByIncludeEmpty}
                onCheckedChange={actions.setGroupByIncludeEmpty}
              />
              <label htmlFor="group-by-include-empty" className="cursor-pointer text-xs text-muted-foreground">
                Include empty values
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Metrics (y-axis) */}
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

      {/* Order by */}
      <div className="px-4 py-3">
        <div className="rounded-xl border p-3">
          <p className="mb-2 text-xs text-muted-foreground">Order by</p>
          <Popover open={orderByOpen} onOpenChange={setOrderByOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={orderByOpen}
                disabled={orderByOptions.length === 0}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">{orderByLabel}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>No options available.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value={NONE_VALUE} onSelect={() => { actions.setOrderBy(null); setOrderByOpen(false) }}>
                      <Check className={cn("size-4", !orderBy ? "opacity-100" : "opacity-0")} />
                      <span className="text-muted-foreground">None</span>
                    </CommandItem>
                    {orderByOptions.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => {
                          actions.setOrderBy({ target: opt.value, direction: orderBy?.direction ?? "asc" })
                          setOrderByOpen(false)
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
                onClick={() => actions.setOrderBy({ ...orderBy, direction: "asc" })}
              >
                ASC
              </Button>
              <Button
                variant={orderBy.direction === "desc" ? "secondary" : "outline"}
                size="sm"
                className="flex-1 text-xs border"
                onClick={() => actions.setOrderBy({ ...orderBy, direction: "desc" })}
              >
                DESC
              </Button>
            </div>
          )}
        </div>
      </div>

    </aside>
  )
}
