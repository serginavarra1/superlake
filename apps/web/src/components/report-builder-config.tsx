import * as React from "react"
import { Check, ChevronsUpDown, Plus, Trash, Trash2, X } from "lucide-react"
import { useDatasets } from "@/hooks/use-datasets"
import { useTableDetails } from "@/hooks/use-table-details"
import { useReportBuilder, type DimensionGranularity } from "@/contexts/report-builder-context"
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

const OPERATIONS = [
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

function defaultOperation(fieldType: string) {
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

export function ReportBuilderConfig() {
  const [dataSourceOpen, setDataSourceOpen] = React.useState(false)
  const [dimensionOpen, setDimensionOpen] = React.useState(false)
  const [groupByOpen, setGroupByOpen] = React.useState(false)
  // Tracks which metric popover is open: "{index}-op" | "{index}-col" | null
  const [metricPopover, setMetricPopover] = React.useState<string | null>(null)

  const { config, setDataSource, setDimension, setDimensionGranularity, setGroupBy, setGroupByGranularity, addMetric, updateMetric, removeMetric } = useReportBuilder()
  const { dataSource, dimension, dimensionGranularity, groupBy, groupByGranularity, metrics } = config

  const { data: datasets } = useDatasets()
  const { data: tableDetails, isLoading: isLoadingColumns } = useTableDetails(
    dataSource?.datasetId ?? "",
    dataSource?.tableId ?? "",
  )

  function handleSelectTable(datasetId: string, tableId: string) {
    setDataSource({ datasetId, tableId })
    setDataSourceOpen(false)
  }

  function handleSelectDimension(column: string | null) {
    setDimension(column)
    if (column) {
      const fieldType = tableDetails?.schema.find((f) => f.name === column)?.type ?? ""
      if (DATE_TYPES.has(fieldType.toUpperCase())) setDimensionGranularity("date")
    }
    setDimensionOpen(false)
  }

  function handleSelectGroupBy(column: string | null) {
    setGroupBy(column)
    if (column) {
      const fieldType = tableDetails?.schema.find((f) => f.name === column)?.type ?? ""
      if (DATE_TYPES.has(fieldType.toUpperCase())) setGroupByGranularity("date")
    }
    setGroupByOpen(false)
  }

  function handleSelectOperation(index: number, operation: string) {
    updateMetric(index, { ...metrics[index], operation })
    setMetricPopover(null)
  }

  function handleSelectMetricColumn(index: number, column: string | null) {
    if (!column) {
      removeMetric(index)
    } else {
      const fieldType = tableDetails?.schema.find((f) => f.name === column)?.type ?? ""
      const operation = defaultOperation(fieldType)
      updateMetric(index, { operation, column })
    }
    setMetricPopover(null)
  }

  function handleAddMetric() {
    addMetric({ operation: "count", column: "" })
  }

  const dataSourceLabel = dataSource ? (
    <span>{dataSource.datasetId} / <strong>{dataSource.tableId}</strong></span>
  ) : (
    "Select a table…"
  )

  const dimensionField = tableDetails?.schema.find((f) => f.name === dimension)
  const isDimDate = dimensionField ? DATE_TYPES.has(dimensionField.type.toUpperCase()) : false

  const groupByField = tableDetails?.schema.find((f) => f.name === groupBy)
  const isGroupByDate = groupByField ? DATE_TYPES.has(groupByField.type.toUpperCase()) : false

  const dimensionLabel = dimension ?? "Select a column…"
  const groupByLabel = groupBy ?? "None"

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
                        onSelect={() => handleSelectTable(dataset.datasetId, table.tableId)}
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
          <Popover open={dimensionOpen} onOpenChange={setDimensionOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={dimensionOpen}
                disabled={!dataSource || isLoadingColumns}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">{dimensionLabel}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search columns…" />
                <CommandList>
                  <CommandEmpty>No columns found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => handleSelectDimension(null)}>
                      <Check className={cn("size-4", !dimension ? "opacity-100" : "opacity-0")} />
                      <span className="text-muted-foreground">None</span>
                    </CommandItem>
                    {tableDetails?.schema.map((field) => (
                      <CommandItem
                        key={field.name}
                        value={field.name}
                        onSelect={() => handleSelectDimension(field.name)}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            dimension === field.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1 truncate">{field.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {isDimDate && (
            <div className="mt-2 flex gap-1">
              {GRANULARITIES.map((g) => (
                <Button
                  key={g.value}
                  variant={dimensionGranularity === g.value ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 text-xs border"
                  onClick={() => setDimensionGranularity(g.value)}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          )}

          <p className="mb-2 mt-3 text-xs text-muted-foreground">Group by</p>
          <Popover open={groupByOpen} onOpenChange={setGroupByOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={groupByOpen}
                disabled={!dataSource || !dimension || isLoadingColumns}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">{groupByLabel}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search columns…" />
                <CommandList>
                  <CommandEmpty>No columns found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => handleSelectGroupBy(null)}>
                      <Check className={cn("size-4", !groupBy ? "opacity-100" : "opacity-0")} />
                      <span className="text-muted-foreground">None</span>
                    </CommandItem>
                    {tableDetails?.schema.map((field) => (
                      <CommandItem
                        key={field.name}
                        value={field.name}
                        onSelect={() => handleSelectGroupBy(field.name)}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            groupBy === field.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1 truncate">{field.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {isGroupByDate && (
            <div className="mt-2 flex gap-1">
              {GRANULARITIES.map((g) => (
                <Button
                  key={g.value}
                  variant={groupByGranularity === g.value ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 text-xs border"
                  onClick={() => setGroupByGranularity(g.value)}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics (y-axis) */}
      <div className="px-4 py-3">
        <div className="rounded-xl border p-3">
          <p className="mb-2 text-xs text-muted-foreground">Metrics</p>

          {metrics.map((metric, index) => (
            <div key={index} className={cn("flex gap-2", index > 0 && "mt-2")}>
              {/* Operation picker */}
              <Popover
                open={metricPopover === `${index}-op`}
                onOpenChange={(open) => setMetricPopover(open ? `${index}-op` : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={!dataSource}
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
                        {availableOperations(tableDetails?.schema.find((f) => f.name === metric.column)?.type ?? "").map((op) => (
                          <CommandItem
                            key={op.value}
                            value={op.value}
                            onSelect={() => handleSelectOperation(index, op.value)}
                          >
                            <Check
                              className={cn(
                                "size-4",
                                metric.operation === op.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="font-mono font-medium">{op.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Column picker */}
              <Popover
                open={metricPopover === `${index}-col`}
                onOpenChange={(open) => setMetricPopover(open ? `${index}-col` : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={!dataSource || isLoadingColumns}
                    className="min-w-0 flex-1 justify-between font-normal"
                  >
                    <span className="truncate">{metric.column || "Column…"}</span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search columns…" />
                    <CommandList>
                      <CommandEmpty>No columns found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="__none__" onSelect={() => handleSelectMetricColumn(index, null)}>
                          <Check className={cn("size-4", !metric.column ? "opacity-100" : "opacity-0")} />
                          <span className="text-muted-foreground">None</span>
                        </CommandItem>
                        {tableDetails?.schema.map((field) => (
                          <CommandItem
                            key={field.name}
                            value={field.name}
                            onSelect={() => handleSelectMetricColumn(index, field.name)}
                          >
                            <Check
                              className={cn(
                                "size-4",
                                metric.column === field.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="flex-1 truncate">{field.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground border"
                onClick={() => removeMetric(index)}
              >
                <Trash className="size-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            disabled={!dataSource}
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={handleAddMetric}
          >
            <Plus className="mr-1 size-4" />
            Add metric
          </Button>
        </div>
      </div>

    </aside>
  )
}
