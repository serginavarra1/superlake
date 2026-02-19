import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { TableDetails } from '@/types/api'

export function useTableDetails(datasetId: string, tableId: string) {
  return useQuery({
    queryKey: ['tableDetails', datasetId, tableId],
    queryFn: () =>
      apiFetch<{ data: TableDetails }>(
        `/datasets/${datasetId}/tables/${tableId}`,
      ).then((res) => res.data),
    enabled: Boolean(datasetId && tableId),
  })
}