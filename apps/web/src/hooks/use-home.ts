import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { HomeStats } from '@/types/api'

export function useHomeStats() {
  return useQuery({
    queryKey: ['home-stats'],
    queryFn: () => apiFetch<{ data: HomeStats }>('/home').then((res) => res.data),
  })
}
