import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ReportConfig } from '@/contexts/report-builder-context'

export interface PreviewWidget {
  id: string
  config: ReportConfig
  x: number
  y: number
  w: number
  h: number
}

export interface PreviewDashboard {
  title: string
  widgets: PreviewWidget[]
}

interface PreviewPayload {
  title: string
  widgets: Array<{ config: ReportConfig; x: number; y: number; w: number; h: number }>
}

interface DashboardPreviewContextValue {
  previewDashboard: PreviewDashboard | null
  openPreview: (payload: PreviewPayload) => void
  closePreview: () => void
}

const DashboardPreviewContext = createContext<DashboardPreviewContextValue | null>(null)

export function DashboardPreviewProvider({ children }: { children: ReactNode }) {
  const [previewDashboard, setPreviewDashboard] = useState<PreviewDashboard | null>(null)

  const openPreview = useCallback((payload: PreviewPayload) => {
    setPreviewDashboard({
      title: payload.title,
      widgets: payload.widgets.map((w) => ({ ...w, id: crypto.randomUUID() })),
    })
  }, [])

  const closePreview = useCallback(() => setPreviewDashboard(null), [])

  const value = useMemo(
    () => ({ previewDashboard, openPreview, closePreview }),
    [previewDashboard, openPreview, closePreview],
  )

  return (
    <DashboardPreviewContext.Provider value={value}>
      {children}
    </DashboardPreviewContext.Provider>
  )
}

export function useDashboardPreview() {
  const ctx = useContext(DashboardPreviewContext)
  if (!ctx) throw new Error('useDashboardPreview must be used inside DashboardPreviewProvider')
  return ctx
}
