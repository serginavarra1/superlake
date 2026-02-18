import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { DatasetInfo } from '@/types/api'

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () =>
      apiFetch<{ data: DatasetInfo[] }>('/datasets').then((res) => res.data),
  })
}
