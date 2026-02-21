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

const GRAN_LABELS: Record<DimensionGranularity, string> = {
  date: "Date",
  month_year: "Month",
  year: "Year",
}

function makeDateFormatter(granularity: DimensionGranularity | null) {
  if (granularity === "month_year") {
    return ({ value }: { value: string }) => {
      if (!value) return value
      const [year, month] = value.split("-")
      return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    }
  }
  if (granularity === "year") {
    return ({ value }: { value: string }) => (value ? value.slice(0, 4) : value)
  }
  return undefined
}

function deriveColumns(config: ReportConfig): ColDef[] {
  const cols: ColDef[] = []

  if (config.dimension) {
    const label = config.dimensionGranularity
      ? `${config.dimension} (${GRAN_LABELS[config.dimensionGranularity]})`
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
      ? `${config.groupBy} (${GRAN_LABELS[config.groupByGranularity]})`
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
      <div className="flex items-center justify-between px-4 py-2">
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
