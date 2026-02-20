import { BarChart2 } from "lucide-react"
import { ReportBuilderProvider } from "@/contexts/report-builder-context"
import { ReportBuilderConfig } from "@/components/report-builder-config"

export default function ReportBuilder() {
  return (
    <ReportBuilderProvider>
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h1 className="text-sm font-medium">New report</h1>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chart area */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <BarChart2 className="size-12 opacity-30" />
              <p className="text-sm">Configure your report to preview the chart</p>
            </div>
          </div>

          <ReportBuilderConfig />
        </div>
      </div>
    </ReportBuilderProvider>
  )
}
