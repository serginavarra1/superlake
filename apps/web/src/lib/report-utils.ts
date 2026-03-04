import type { ReportConfig, Metric } from "@/contexts/report-builder-context"
import type { SchemaField } from "@/types/api"

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

// Flatten a nested SchemaField tree into a flat list of leaf fields with
// dot-notation paths (e.g. "address.street"). RECORD fields are containers
// and cannot be used directly in BigQuery SELECT/GROUP BY, so only their
// leaf sub-fields are included.
export function flattenSchema(
  fields: SchemaField[],
  prefix = '',
): { name: string; type: string }[] {
  return fields.flatMap((f) => {
    const path = prefix ? `${prefix}.${f.name}` : f.name
    if (f.fields && f.fields.length > 0) {
      return flattenSchema(f.fields, path)
    }
    return [{ name: path, type: f.type }]
  })
}