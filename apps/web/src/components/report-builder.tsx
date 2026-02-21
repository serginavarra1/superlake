import { BarChart2 } from "lucide-react"
import { ReportBuilderProvider } from "@/contexts/report-builder-context"
import { ReportBuilderConfig } from "@/components/report-builder-config"
import { ReportDataTable } from "@/components/report-data-table"

interface ReportBuilderProps {
  title?: string
}

export default function ReportBuilder({ title = "New report" }: ReportBuilderProps) {
  return (
    <ReportBuilderProvider>
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h1 className="text-sm font-medium">{title}</h1>
        </div>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Chart area */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <BarChart2 className="size-12 opacity-30" />
                <p className="text-sm">Configure your report to preview the chart</p>
              </div>
            </div>

            {/* Data table */}
            <ReportDataTable />
          </div>

          <ReportBuilderConfig />
        </div>
      </div>
    </ReportBuilderProvider>
  )
}
