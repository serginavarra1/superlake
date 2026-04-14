import * as React from "react"
import { BarChart2, Check, ChevronsUpDown, Hash, LineChart, PieChart } from "lucide-react"
import {
  useReportConfig,
  useReportActions,
  type VisualizationType,
} from "@/contexts/report-builder-context"
import { useTableDetails } from "@/hooks/use-table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const DATE_TYPES = new Set(["DATE", "DATETIME", "TIMESTAMP", "TIMESTAMP_NTZ"])

const VISUALIZATION_OPTIONS: {
  type: VisualizationType
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { type: "bar",           label: "Bar",    icon: BarChart2 },
  { type: "line",          label: "Line",   icon: LineChart },
  { type: "pie",           label: "Pie",    icon: PieChart  },
  { type: "single_metric", label: "Metric", icon: Hash      },
]

// ---------------------------------------------------------------------------
// Compatibility and inference
// ---------------------------------------------------------------------------

function getVisCompatibility(
  type: VisualizationType,
  opts: { hasDimension: boolean; hasGroupBy: boolean; configuredMetricCount: number },
): { compatible: boolean; reason?: string } {
  const { hasDimension, hasGroupBy, configuredMetricCount } = opts
  const hasMetrics = configuredMetricCount > 0

  switch (type) {
    case "bar":
      if (!hasDimension) return { compatible: false, reason: "Requires a dimension" }
      if (!hasMetrics)   return { compatible: false, reason: "Requires at least one metric" }
      return { compatible: true }
    case "line":
      if (!hasDimension) return { compatible: false, reason: "Requires a dimension" }
      if (!hasMetrics)   return { compatible: false, reason: "Requires at least one metric" }
      return { compatible: true }
    case "pie":
      if (!hasDimension)               return { compatible: false, reason: "Requires a dimension" }
      if (hasGroupBy)                  return { compatible: false, reason: "Incompatible with group by" }
      if (configuredMetricCount === 0) return { compatible: false, reason: "Requires a metric" }
      if (configuredMetricCount > 1)   return { compatible: false, reason: "Requires exactly one metric" }
      return { compatible: true }
    case "single_metric":
      if (hasDimension)                return { compatible: false, reason: "Incompatible with dimension" }
      if (hasGroupBy)                  return { compatible: false, reason: "Incompatible with group by" }
      if (configuredMetricCount === 0) return { compatible: false, reason: "Requires a metric" }
      if (configuredMetricCount > 1)   return { compatible: false, reason: "Requires exactly one metric" }
      return { compatible: true }
  }
}

function inferVisualizationType(opts: {
  hasDimension: boolean
  hasGroupBy: boolean
  isDimDate: boolean
  configuredMetricCount: number
}): VisualizationType | null {
  const { hasDimension, hasGroupBy, isDimDate, configuredMetricCount } = opts
  if (configuredMetricCount === 0) return null
  if (!hasDimension && !hasGroupBy && configuredMetricCount === 1) return "single_metric"
  if (hasDimension) return isDimDate ? "line" : "bar"
  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisualizationSelector() {
  const [open, setOpen] = React.useState(false)

  const { dataSource, dimension, groupBy, metrics, visualization } = useReportConfig()
  const { setVisualization } = useReportActions()

  const { data: tableDetails } = useTableDetails(
    dataSource?.datasetId ?? "",
    dataSource?.tableId ?? "",
  )

  const schema = tableDetails?.schema
  const isDimDate = dimension
    ? DATE_TYPES.has((schema?.find((f) => f.name === dimension)?.type ?? "").toUpperCase())
    : false

  const hasDimension = dimension !== null
  const hasGroupBy = groupBy !== null
  const configuredMetricCount = metrics.filter((m) => m.column !== null || m.operation === "count").length
  const canStack = hasGroupBy || configuredMetricCount > 1

  // Use a ref so the effect can read the current visualization without causing a loop.
  const visualizationRef = React.useRef(visualization)
  visualizationRef.current = visualization

  React.useEffect(() => {
    const inferred = inferVisualizationType({ hasDimension, hasGroupBy, isDimDate, configuredMetricCount })
    if (inferred === null) return

    const current = visualizationRef.current
    if (current === null) {
      setVisualization({ type: inferred, stacked: false })
      return
    }

    const { compatible } = getVisCompatibility(current.type, { hasDimension, hasGroupBy, configuredMetricCount })
    if (!compatible) {
      setVisualization({ type: inferred, stacked: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDimension, hasGroupBy, isDimDate, configuredMetricCount])

  const currentOpt = VISUALIZATION_OPTIONS.find((o) => o.type === visualization?.type)

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">Visualization</p>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {currentOpt ? (
              <span className="flex items-center gap-2">
                <currentOpt.icon className="size-4 shrink-0" />
                <span className="truncate">
                  {currentOpt.label}
                  {currentOpt.type === "line" && hasGroupBy ? " (Multiline)" : ""}
                  {currentOpt.type === "bar" && visualization?.stacked ? " · Stacked" : ""}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select…</span>
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup>
                {VISUALIZATION_OPTIONS.map((opt) => {
                  const { compatible, reason } = getVisCompatibility(opt.type, { hasDimension, hasGroupBy, configuredMetricCount })
                  return (
                    <CommandItem
                      key={opt.type}
                      value={opt.type}
                      disabled={!compatible}
                      onSelect={() => {
                        setVisualization({ type: opt.type, stacked: visualization?.stacked ?? false })
                        setOpen(false)
                      }}
                    >
                      <Check className={cn("size-4", visualization?.type === opt.type ? "opacity-100" : "opacity-0")} />
                      <opt.icon className="size-4 shrink-0" />
                      <span className="flex-1">{opt.label}</span>
                      {!compatible && <span className="ml-2 truncate text-xs text-muted-foreground">{reason}</span>}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {visualization?.type === "bar" && canStack && (
        <div className="mt-2 flex items-center gap-2">
          <Switch
            id="vis-stacked"
            checked={visualization.stacked}
            onCheckedChange={(checked) =>
              setVisualization({ ...visualization, stacked: checked })
            }
          />
          <label htmlFor="vis-stacked" className="cursor-pointer text-xs text-muted-foreground">
            Stacked
          </label>
        </div>
      )}
    </div>
  )
}
