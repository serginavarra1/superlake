import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export function useDistinctColumnValues(
  datasetId: string | null,
  tableId: string | null,
  column: string | null,
) {
  return useQuery({
    queryKey: ['distinctValues', datasetId, tableId, column],
    queryFn: () =>
      apiFetch<{ data: (string | number | null)[] }>(
        `/datasets/${datasetId}/tables/${tableId}/columns/${column}/distinct-values`,
      ).then((res) => res.data),
    enabled: Boolean(datasetId && tableId && column),
  })
}
