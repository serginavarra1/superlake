import type { ReportConfig, Metric } from "@/contexts/report-builder-context"

export const DIMENSION_KEY = "dimension" as const
export const GROUP_BY_KEY = "group_by" as const
export const metricKey = (index: number) => `metric_${index}`

export function isQueryable(config: ReportConfig): boolean {
  if (!config.dataSource) return false
  const hasMetric = config.metrics.some((m) => m.column !== null)
  return !!(config.dimension || hasMetric)
}

export function metricLabel(m: Metric): string {
  return m.column
    ? `${m.operation.toUpperCase()}(${m.column})`
    : `${m.operation.toUpperCase()}(*)`
}