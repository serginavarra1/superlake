import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { Dashboard, DashboardWidget } from '@/types/api'
import type { ReportConfig } from '@/contexts/report-builder-context'

export function useDashboards() {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: () =>
      apiFetch<{ data: Dashboard[] }>('/dashboards').then((res) => res.data),
  })
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: ['dashboards', id],
    queryFn: () =>
      apiFetch<{ data: Dashboard }>(`/dashboards/${id}`).then((res) => res.data),
    enabled: !!id,
  })
}

export function useCreateDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      apiFetch<{ data: Dashboard }>('/dashboards', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiFetch<{ data: Dashboard }>(`/dashboards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/dashboards/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })
}

export function useAddWidget(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { type: 'report'; config: ReportConfig; x: number; y: number; w: number; h: number }) =>
      apiFetch<{ data: DashboardWidget }>(`/dashboards/${dashboardId}/widgets`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', dashboardId] })
    },
  })
}

export function useUpdateWidget(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      widgetId,
      ...payload
    }: {
      widgetId: string
      config?: ReportConfig
      x?: number
      y?: number
      w?: number
      h?: number
    }) =>
      apiFetch<{ data: DashboardWidget }>(`/dashboards/${dashboardId}/widgets/${widgetId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', dashboardId] })
    },
  })
}

export function useDeleteWidget(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (widgetId: string) =>
      apiFetch(`/dashboards/${dashboardId}/widgets/${widgetId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', dashboardId] })
    },
  })
}

export function useToggleFavourite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ isFavourite: boolean }>(`/dashboards/${id}/favourite`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })
}

export function useDuplicateDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: Dashboard }>(`/dashboards/${id}/duplicate`, { method: 'POST' }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })
}

export function useBatchUpdateWidgets(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (widgets: Array<{ id: string; x: number; y: number; w: number; h: number }>) =>
      apiFetch(`/dashboards/${dashboardId}/widgets`, {
        method: 'PATCH',
        body: JSON.stringify({ widgets }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', dashboardId] })
    },
  })
}
