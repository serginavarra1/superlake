import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { TableDetails, TableRowsResult } from '@/types/api'

export function useTableDetails(datasetId: string, tableId: string) {
  return useQuery({
    queryKey: ['table', datasetId, tableId],
    queryFn: () =>
      apiFetch<{ data: TableDetails }>(
        `/datasets/${datasetId}/tables/${tableId}`,
      ).then((res) => res.data),
    enabled: Boolean(datasetId && tableId),
  })
}

export function useUpdateTable(datasetId: string, tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { description?: string; fieldDescriptions?: { path: string; description: string }[] }) =>
      apiFetch(`/datasets/${datasetId}/tables/${tableId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', datasetId, tableId] })
    },
  })
}

export function useTableRows(
  datasetId: string,
  tableId: string,
  page: number,
  pageSize: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['tableRows', datasetId, tableId, page, pageSize],
    queryFn: () =>
      apiFetch<{ data: TableRowsResult }>(
        `/datasets/${datasetId}/tables/${tableId}/rows?startIndex=${page * pageSize}&maxResults=${pageSize}`,
      ).then((res) => res.data),
    enabled: enabled && Boolean(datasetId && tableId),
    staleTime: 30_000,
  })
}

export function useDeleteTable(datasetId: string, tableId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch(`/datasets/${datasetId}/tables/${tableId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', datasetId, tableId] })
      queryClient.invalidateQueries({ queryKey: ['tables', datasetId] })
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      onSuccess?.()
    },
  })
}
