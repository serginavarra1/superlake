import { BarChart2, Loader2 } from "lucide-react"
import { AgCharts } from "ag-charts-react"
import {
  ModuleRegistry,
  type AgChartOptions,
  BarSeriesModule,
  LineSeriesModule,
  PieSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  LegendModule,
} from "ag-charts-community"
import type { ReportConfig, Metric, VisualizationType } from "@/contexts/report-builder-context"

ModuleRegistry.registerModules([
  BarSeriesModule,
  LineSeriesModule,
  PieSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  LegendModule,
])

interface ReportChartProps {
  config: ReportConfig
  data: Record<string, unknown>[] | undefined
  isFetching: boolean
  isError: boolean
}

function metricLabel(m: Metric): string {
  return m.column ? `${m.operation.toUpperCase()}(${m.column})` : `${m.operation.toUpperCase()}(*)`
}

const numFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

function isQueryable(config: ReportConfig): boolean {
  if (!config.dataSource) return false
  const hasMetric = config.metrics.some((m) => m.column !== null)
  return !!(config.dimension || hasMetric)
}

/**
 * Pivot raw rows that have a `group_by` column into wide-format rows where
 * each unique group_by value becomes its own key(s).
 *
 * Input:  [{ dimension: "Jan", group_by: "A", metric_0: 10 }, { dimension: "Jan", group_by: "B", metric_0: 20 }, ...]
 * Output: [{ dimension: "Jan", "A__0": 10, "B__0": 20 }, ...]
 */
function pivotData(
  rows: Record<string, unknown>[],
  metricCount: number,
): { pivoted: Record<string, unknown>[]; groupVals: string[] } {
  const groupVals: string[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const g = String(row.group_by ?? "")
    if (!seen.has(g)) {
      seen.add(g)
      groupVals.push(g)
    }
  }

  // Build a map: dimension → { groupVal → { metricIdx → value } }
  const dimMap = new Map<unknown, Map<string, Record<number, unknown>>>()
  // Also track dimension order
  const dimOrder: unknown[] = []

  for (const row of rows) {
    const dim = row.dimension
    const g = String(row.group_by ?? "")
    if (!dimMap.has(dim)) {
      dimMap.set(dim, new Map())
      dimOrder.push(dim)
    }
    const groupMap = dimMap.get(dim)!
    if (!groupMap.has(g)) groupMap.set(g, {})
    const metrics = groupMap.get(g)!
    for (let i = 0; i < metricCount; i++) {
      metrics[i] = row[`metric_${i}`] ?? null
    }
  }

  const pivoted = dimOrder.map((dim) => {
    const row: Record<string, unknown> = { dimension: dim }
    const groupMap = dimMap.get(dim)!
    for (const g of groupVals) {
      const metrics = groupMap.get(g) ?? {}
      for (let i = 0; i < metricCount; i++) {
        row[`${g}__${i}`] = metrics[i] ?? null
      }
    }
    return row
  })

  return { pivoted, groupVals }
}

function buildChartOptions(
  config: ReportConfig,
  data: Record<string, unknown>[],
): AgChartOptions | null {
  const vizType: VisualizationType = config.visualization?.type ?? "bar"
  const stacked = config.visualization?.stacked ?? false

  if (vizType === "single_metric") return null // rendered separately

  if (vizType === "pie") {
    const total = data.reduce((sum, row) => sum + Number(row["metric_0"] ?? 0), 0)
    return {
      data,
      series: [
        {
          type: "pie",
          angleKey: "metric_0",
          legendItemKey: "dimension",
          tooltip: {
            renderer: ({ datum, angleKey }: { datum: Record<string, unknown>; angleKey: string }) => {
              const value = Number(datum[angleKey] ?? 0)
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"
              const metricName = config.metrics[0] ? metricLabel(config.metrics[0]) : "Value"
              return {
                title: String(datum["dimension"] ?? ""),
                data: [
                  { label: metricName, value: numFmt.format(value) },
                  { label: "Share", value: `${percentage}%` },
                ],
              }
            },
          },
        },
      ],
    } as unknown as AgChartOptions
  }

  // bar or line — build series with literal types so TS can narrow the discriminated union
  const isLine = vizType === "line"

  if (config.groupBy && data.length > 0) {
    const { pivoted, groupVals } = pivotData(data, config.metrics.length)
    const series = groupVals.flatMap((g) =>
      config.metrics.map((m, i) => {
        const yKey = `${g}__${i}`
        const yName = config.metrics.length === 1 ? String(g) : `${g} – ${metricLabel(m)}`
        return isLine
          ? ({ type: "line" as const, xKey: "dimension", yKey, yName })
          : ({ type: "bar" as const, xKey: "dimension", yKey, yName, stacked })
      })
    )
    return {
      data: pivoted,
      series,
      axes: [
        { type: "category", position: "bottom" },
        { type: "number", position: "left" },
      ],
      tooltip: { mode: "shared" },
      formatter: { y: ",.2~f" },
    } as unknown as AgChartOptions
  }

  const series = config.metrics.map((m, i) => {
    const yKey = `metric_${i}`
    const yName = metricLabel(m)
    return isLine
      ? ({ type: "line" as const, xKey: "dimension", yKey, yName })
      : ({ type: "bar" as const, xKey: "dimension", yKey, yName, stacked })
  })

  return {
    data,
    series,
    axes: [
      { type: "category", position: "bottom" },
      { type: "number", position: "left" },
    ],
    tooltip: { mode: "shared" },
    formatter: { y: ",.2~f" },
  } as unknown as AgChartOptions
}

export function ReportChart({ config, data, isFetching, isError }: ReportChartProps) {
  const queryable = isQueryable(config)
  const vizType = config.visualization?.type

  // Placeholder: nothing configured yet
  if (!queryable) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <BarChart2 className="size-12 opacity-30" />
          <p className="text-sm">Configure your report to preview the chart</p>
        </div>
      </div>
    )
  }

  // Loading state (no data yet)
  if (isFetching && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-destructive">Failed to load chart data</p>
      </div>
    )
  }

  // Empty data
  if (data && data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">No data for current configuration</p>
      </div>
    )
  }

  // Single metric: large number display
  if (vizType === "single_metric" && data && data.length > 0) {
    const value = data[0].metric_0
    const formatted =
      typeof value === "number"
        ? new Intl.NumberFormat().format(value)
        : String(value ?? "—")
    const label = config.metrics[0] ? metricLabel(config.metrics[0]) : ""
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <span className="text-5xl font-semibold tabular-nums">{formatted}</span>
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    )
  }

  // Chart
  if (!data) return null
  const options = buildChartOptions(config, data)
  if (!options) return null

  return (
    <div className="relative flex-1 min-h-0 p-4">
      {isFetching && (
        <div className="absolute right-3 top-3 z-10">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <AgCharts options={options} style={{ height: "100%", width: "100%" }} />
    </div>
  )
}
