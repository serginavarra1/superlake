import { DataSourceSection } from "@/components/data-source-section"
import { DimensionSection } from "@/components/dimension-section"
import { MetricsSection } from "@/components/metrics-section"
import { OrderBySection } from "@/components/order-by-section"
import { VisualizationSelector } from "@/components/visualization-selector"
import { Separator } from "@/components/ui/separator"

export function ReportBuilderConfig() {
  return (
    <aside className="flex w-96 flex-col overflow-y-auto border-l bg-background">
      <DataSourceSection />
      <div className="px-4 py-2"><Separator /></div>
      <DimensionSection />
      <MetricsSection />
      <OrderBySection />
      <div className="px-4 py-2"><Separator /></div>
      <div className="px-4 py-3">
        <VisualizationSelector />
      </div>
    </aside>
  )
}
