import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { Dashboard } from '@/types/api'
import type { ReportConfig } from '@/contexts/report-builder-context'

interface CreateDashboardPayload {
  title: string
  widgets: Array<{ config: ReportConfig; x: number; y: number; w: number; h: number }>
}

export function useCreateDashboardFromPreview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDashboardPayload) =>
      apiFetch<{ data: Dashboard }>('/dashboards/with-widgets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })
}
