import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useDebounce } from '@/hooks/use-debounce'
import { isQueryable } from '@/lib/report-utils'
import type { ReportConfig } from '@/contexts/report-builder-context'

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
    filters: config.filters.filter(
      (f) => f.condition.column && f.condition.operator,
    ),
  }
}

export function useReportQuery(config: ReportConfig) {
  const payload = buildQueryPayload(config)
  const debouncedPayload = useDebounce(payload, 400)

  return useQuery({
    queryKey: ['report-query', debouncedPayload],
    queryFn: () =>
      apiFetch<{ data: Record<string, unknown>[] }>('/reports/query', {
        method: 'POST',
        body: JSON.stringify(debouncedPayload),
      }).then((res) => res.data),
    enabled: isQueryable(config),
  })
}
