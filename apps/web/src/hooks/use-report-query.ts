import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { ReportConfig } from '@/contexts/report-builder-context'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function isQueryable(config: ReportConfig): boolean {
  if (!config.dataSource) return false
  const hasMetric = config.metrics.some((m) => m.column !== null)
  return !!(config.dimension || hasMetric)
}

/**
 * Maps ReportConfig to the API request payload.
 * Keeps UI-only fields (added in the future) out of the request body.
 */
function buildQueryPayload(config: ReportConfig) {
  return {
    dataSource: config.dataSource,
    dimension: config.dimension,
    dimensionGranularity: config.dimensionGranularity,
    groupBy: config.groupBy,
    groupByGranularity: config.groupByGranularity,
    groupByIncludeEmpty: config.groupByIncludeEmpty,
    metrics: config.metrics,
    orderBy: config.orderBy,
  }
}

export function useReportQuery(config: ReportConfig) {
  const debouncedConfig = useDebounce(config, 400)

  return useQuery({
    queryKey: ['report-query', debouncedConfig],
    queryFn: () =>
      apiFetch<{ data: Record<string, unknown>[] }>('/reports/query', {
        method: 'POST',
        body: JSON.stringify(buildQueryPayload(debouncedConfig)),
      }).then((res) => res.data),
    enabled: isQueryable(debouncedConfig),
  })
}
