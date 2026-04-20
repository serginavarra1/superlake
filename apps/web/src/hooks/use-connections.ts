import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { FivetranConnection, FivetranService } from '@/types/api'

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () =>
      apiFetch<{ data: FivetranConnection[] }>('/fivetran/connections').then((res) => res.data),
  })
}

export function useFivetranServices({ limit, cursor }: { limit: number; cursor?: string }) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return useQuery({
    queryKey: ['fivetran-services', limit, cursor ?? null],
    queryFn: () =>
      apiFetch<{ data: { items: FivetranService[]; nextCursor?: string } }>(
        `/fivetran/services?${params.toString()}`,
      ).then((res) => res.data),
    placeholderData: (prev) => prev,
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { service: string; schemaName: string; syncFrequency?: number }) =>
      apiFetch<{ data: { connectionId: string; connectCardUrl: string } }>('/fivetran/connections', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useFinalizeConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/fivetran/connections/${id}/finalize`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useSyncConnection() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/fivetran/connections/${id}/sync`, { method: 'POST' }),
  })
}

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/fivetran/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}
