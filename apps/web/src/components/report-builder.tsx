import { ReportBuilderProvider, useReportConfig } from "@/contexts/report-builder-context"
import { ReportBuilderConfig } from "@/components/report-builder-config"
import { ReportDataTable } from "@/components/report-data-table"
import { ReportChart } from "@/components/report-chart"
import { useReportQuery } from "@/hooks/use-report-query"

interface ReportBuilderProps {
  title?: string
}

function ReportBuilderInner({ title }: { title: string }) {
  const config = useReportConfig()
  const { data, isFetching, isError, error } = useReportQuery(config)

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-sm font-medium">{title}</h1>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chart area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ReportChart config={config} data={data} isFetching={isFetching} isError={isError} />

          {/* Data table */}
          <ReportDataTable data={data} isFetching={isFetching} isError={isError} error={error as Error | null} />
        </div>

        <ReportBuilderConfig />
      </div>
    </div>
  )
}

export default function ReportBuilder({ title = "New report" }: ReportBuilderProps) {
  return (
    <ReportBuilderProvider>
      <ReportBuilderInner title={title} />
    </ReportBuilderProvider>
  )
}
