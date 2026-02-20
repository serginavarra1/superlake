import * as React from "react"

interface SelectedTable {
  datasetId: string
  tableId: string
}

export interface Metric {
  operation: string
  column: string
}

export type DimensionGranularity = "date" | "month_year" | "year"

interface ReportConfig {
  dataSource: SelectedTable | null
  dimension: string | null
  dimensionGranularity: DimensionGranularity | null
  groupBy: string | null
  groupByGranularity: DimensionGranularity | null
  metrics: Metric[]
}

interface ReportBuilderContextValue {
  config: ReportConfig
  setDataSource: (dataSource: SelectedTable | null) => void
  setDimension: (column: string | null) => void
  setDimensionGranularity: (granularity: DimensionGranularity | null) => void
  setGroupBy: (column: string | null) => void
  setGroupByGranularity: (granularity: DimensionGranularity | null) => void
  addMetric: (metric: Metric) => void
  updateMetric: (index: number, metric: Metric) => void
  removeMetric: (index: number) => void
}

const ReportBuilderContext = React.createContext<ReportBuilderContextValue | null>(null)

export function ReportBuilderProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<ReportConfig>({
    dataSource: null,
    dimension: null,
    dimensionGranularity: null,
    groupBy: null,
    groupByGranularity: null,
    metrics: [],
  })

  function setDataSource(dataSource: SelectedTable | null) {
    setConfig((prev) => ({ ...prev, dataSource, dimension: null, dimensionGranularity: null, groupBy: null, groupByGranularity: null, metrics: [] }))
  }

  function setDimension(dimension: string | null) {
    setConfig((prev) => ({
      ...prev,
      dimension,
      dimensionGranularity: null,
      ...(dimension === null ? { groupBy: null, groupByGranularity: null } : {}),
    }))
  }

  function setDimensionGranularity(dimensionGranularity: DimensionGranularity | null) {
    setConfig((prev) => ({ ...prev, dimensionGranularity }))
  }

  function setGroupBy(groupBy: string | null) {
    setConfig((prev) => ({ ...prev, groupBy, groupByGranularity: null }))
  }

  function setGroupByGranularity(groupByGranularity: DimensionGranularity | null) {
    setConfig((prev) => ({ ...prev, groupByGranularity }))
  }

  function addMetric(metric: Metric) {
    setConfig((prev) => ({ ...prev, metrics: [...prev.metrics, metric] }))
  }

  function updateMetric(index: number, metric: Metric) {
    setConfig((prev) => {
      const metrics = [...prev.metrics]
      metrics[index] = metric
      return { ...prev, metrics }
    })
  }

  function removeMetric(index: number) {
    setConfig((prev) => ({ ...prev, metrics: prev.metrics.filter((_, i) => i !== index) }))
  }

  return (
    <ReportBuilderContext value={{ config, setDataSource, setDimension, setDimensionGranularity, setGroupBy, setGroupByGranularity, addMetric, updateMetric, removeMetric }}>
      {children}
    </ReportBuilderContext>
  )
}

export function useReportBuilder() {
  const ctx = React.useContext(ReportBuilderContext)
  if (!ctx) throw new Error("useReportBuilder must be used inside ReportBuilderProvider")
  return ctx
}
