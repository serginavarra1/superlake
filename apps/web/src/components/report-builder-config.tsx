import { DataSourceSection } from "@/components/data-source-section"
import { FilterSection } from "@/components/filter-section"
import { DimensionSection } from "@/components/dimension-section"
import { MetricsSection } from "@/components/metrics-section"
import { OrderBySection } from "@/components/order-by-section"
import { VisualizationSelector } from "@/components/visualization-selector"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useReportConfig, useReportActions } from "@/contexts/report-builder-context"

export function ReportBuilderConfig() {
  const { title } = useReportConfig()
  const { setTitle } = useReportActions()

  return (
    <aside className="flex w-96 flex-col border-l bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <p className="mb-2 text-xs text-muted-foreground">Title</p>
          <Input
            placeholder="Visualization title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <DataSourceSection />
        <FilterSection />
        <div className="px-4 py-2"><Separator /></div>
        <DimensionSection />
        <MetricsSection />
        <OrderBySection />
        <div className="px-4 py-2"><Separator /></div>
        <div className="px-4 py-3">
          <VisualizationSelector />
        </div>
      </div>
      <div className="border-t px-4 py-2">
        <Button className="w-full h-8">Save</Button>
      </div>
    </aside>
  )
}
