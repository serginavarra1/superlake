import * as React from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule, type ColDef } from "ag-grid-community"
import { useReportConfig, type DimensionGranularity, type ReportConfig } from "@/contexts/report-builder-context"
import { useReportQuery } from "@/hooks/use-report-query"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

// Register AG Grid modules once at module level. This is intentional — AG Grid's
// ModuleRegistry is a singleton and registration is idempotent.
ModuleRegistry.registerModules([AllCommunityModule])

function granularityLabel(parts: DimensionGranularity): string {
  if (parts.includes("day") && parts.includes("month") && parts.includes("year")) return "Date"
  return parts
    .slice()
    .sort((a, b) => ["day", "month", "year"].indexOf(a) - ["day", "month", "year"].indexOf(b))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" / ")
}

function makeDateFormatter(granularity: DimensionGranularity | null) {
  if (!granularity) return undefined
  const hasDay = granularity.includes("day")
  const hasMonth = granularity.includes("month")
  const hasYear = granularity.includes("year")

  if (hasDay && hasMonth && hasYear) return undefined // full date — use default rendering

  if (!hasDay && hasMonth && hasYear) {
    // month + year: BigQuery DATE_TRUNC returns a date serialised as "2024-01-01"
    return ({ value }: { value: unknown }): string => {
      if (value == null) return ""
      const parts = String(value).split("-")
      if (parts.length < 2) return String(value)
      const [year, month] = parts
      return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    }
  }
  if (!hasDay && !hasMonth && hasYear) {
    // year only: BigQuery DATE_TRUNC returns a date serialised as "2024-01-01"
    return ({ value }: { value: unknown }): string => (value != null ? String(value).slice(0, 4) : "")
  }
  if (!hasDay && hasMonth && !hasYear) {
    // month only: BigQuery EXTRACT returns an integer 1–12
    return ({ value }: { value: unknown }): string => {
      if (value == null) return ""
      const n = Number(value)
      if (isNaN(n)) return String(value)
      return new Date(2000, n - 1).toLocaleDateString("en-US", { month: "long" })
    }
  }
  if (hasDay && !hasMonth && !hasYear) {
    // day only: BigQuery EXTRACT returns an integer 1–31, no reformatting needed
    return ({ value }: { value: unknown }): string => (value != null ? String(value) : "")
  }
  if (hasDay && hasMonth && !hasYear) {
    // day + month: BigQuery FORMAT_DATE returns "MM-DD" e.g. "01-15"
    return ({ value }: { value: unknown }): string => {
      if (value == null) return ""
      const parts = String(value).split("-")
      if (parts.length < 2) return String(value)
      const [mm, dd] = parts
      return new Date(2000, Number(mm) - 1, Number(dd)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }
  if (hasDay && !hasMonth && hasYear) {
    // day + year: BigQuery FORMAT_DATE returns "YYYY-DD" e.g. "2024-15"
    return ({ value }: { value: unknown }): string => {
      if (value == null) return ""
      const parts = String(value).split("-")
      if (parts.length < 2) return String(value)
      const [year, dd] = parts
      return `Day ${Number(dd)}, ${year}`
    }
  }
  return undefined
}

function deriveColumns(config: ReportConfig): ColDef[] {
  const cols: ColDef[] = []

  if (config.dimension) {
    const label = config.dimensionGranularity
      ? `${config.dimension} (${granularityLabel(config.dimensionGranularity)})`
      : config.dimension
    cols.push({
      field: "dimension",
      headerName: label,
      flex: 1,
      valueFormatter: makeDateFormatter(config.dimensionGranularity),
    })
  }

  if (config.groupBy) {
    const label = config.groupByGranularity
      ? `${config.groupBy} (${granularityLabel(config.groupByGranularity)})`
      : config.groupBy
    cols.push({
      field: "group_by",
      headerName: label,
      flex: 1,
      valueFormatter: makeDateFormatter(config.groupByGranularity),
    })
  }

  config.metrics.forEach((m, i) => {
    const label = m.column
      ? `${m.operation.toUpperCase()}(${m.column})`
      : `${m.operation.toUpperCase()}(*)`
    cols.push({ field: `metric_${i}`, headerName: label, flex: 1 })
  })

  return cols
}

export function ReportDataTable() {
  const [open, setOpen] = React.useState(false)
  const config = useReportConfig()
  const { data, isFetching, isError, error } = useReportQuery(config)

  const colDefs = React.useMemo(() => deriveColumns(config), [config])
  const rowData = React.useMemo(() => data ?? [], [data])

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Data</p>
          {isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          {!isFetching && data && (
            <span className="text-xs text-muted-foreground">{data.length} rows</span>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7">
            {open
              ? <ChevronUp className="size-4" />
              : <ChevronDown className="size-4" />
            }
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="h-72 px-4 pb-4">
          {isError ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive">
              {(error as Error)?.message ?? "Failed to load data"}
            </div>
          ) : (
            <div className="h-full w-full">
              <AgGridReact
                rowData={rowData}
                columnDefs={colDefs}
                defaultColDef={{ sortable: false, resizable: false }}
                rowHeight={36}
                headerHeight={36}
                suppressMovableColumns
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
