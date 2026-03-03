import { ReportBuilderProvider, useReportConfig, useReportActions } from "@/contexts/report-builder-context"
import type { ReportConfig } from "@/contexts/report-builder-context"
import { ReportBuilderConfig } from "@/components/report-builder-config"
import { ReportDataTable } from "@/components/report-data-table"
import { ReportChart } from "@/components/report-chart"
import { useReportQuery } from "@/hooks/use-report-query"

function ReportBuilderInner({ onSave }: { onSave?: (config: ReportConfig) => void }) {
  const config = useReportConfig()
  const { setTitle } = useReportActions()
  const { data, isFetching, isError, error } = useReportQuery(config)

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <input
          value={config.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New report"
          className="bg-transparent w-96 text-sm font-medium outline-none placeholder:text-muted-foreground hover:bg-muted focus:bg-muted rounded px-1 py-1"
        />
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chart area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ReportChart config={config} data={data} isFetching={isFetching} isError={isError} />

          {/* Data table */}
          <ReportDataTable data={data} isFetching={isFetching} isError={isError} error={error} />
        </div>

        <ReportBuilderConfig onSave={() => onSave?.(config)} />
      </div>
    </div>
  )
}

export default function ReportBuilder({
  onSave,
  initialConfig,
}: {
  onSave?: (config: ReportConfig) => void
  initialConfig?: ReportConfig
}) {
  return (
    <ReportBuilderProvider initialConfig={initialConfig}>
      <ReportBuilderInner onSave={onSave} />
    </ReportBuilderProvider>
  )
}
