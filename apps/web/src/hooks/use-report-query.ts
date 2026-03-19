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

export function useBatchReportQuery(widgets: Array<{ id: string; config: ReportConfig }>) {
  const queryable = widgets.map(({ id, config }) => ({
    id,
    payload: isQueryable(config) ? buildQueryPayload(config) : null,
  }))

  const queries = queryable.flatMap((w) => (w.payload ? [w.payload] : []))

  return useQuery({
    queryKey: ['batch-report-query', queryable.map((w) => w.payload)],
    queryFn: () =>
      apiFetch<{ data: (unknown[] | null)[] }>('/dashboards/widget-data/batch', {
        method: 'POST',
        body: JSON.stringify({ queries }),
      }).then((res) => {
        const map = new Map<string, unknown[] | null>()
        let qi = 0
        for (const { id, payload } of queryable) {
          map.set(id, payload ? (res.data[qi++] ?? null) : null)
        }
        return map
      }),
    enabled: queries.length > 0,
  })
}

export function useReportQuery(config: ReportConfig) {
  const payload = buildQueryPayload(config)
  const debouncedPayload = useDebounce(payload, 400)

  return useQuery({
    queryKey: ['report-query', debouncedPayload],
    queryFn: () =>
      apiFetch<{ data: Record<string, unknown>[] }>('/dashboards/widget-data', {
        method: 'POST',
        body: JSON.stringify(debouncedPayload),
      }).then((res) => res.data),
    enabled: isQueryable(config),
  })
}
