import { toast } from 'sonner'
import GridLayout, { useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportChart } from '@/components/report/report-chart'
import { useBatchReportQuery } from '@/hooks/use-report-query'
import { useDashboardPreview } from '@/contexts/dashboard-preview-context'
import { useCreateDashboardFromPreview } from '@/hooks/use-create-dashboard-from-preview'

const COLS = 24
const ROW_HEIGHT = 30

export function DashboardPreviewPanel() {
  const { previewDashboard, closePreview } = useDashboardPreview()
  const createDashboard = useCreateDashboardFromPreview()
  const { width, mounted, containerRef } = useContainerWidth({ measureBeforeMount: true })

  const widgets = previewDashboard?.widgets ?? []
  const { data: batchData, isFetching: batchFetching } = useBatchReportQuery(
    widgets.map((w) => ({ id: w.id, config: w.config })),
  )

  if (!previewDashboard) return null

  const layout = widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }))

  function handleSave() {
    if (!previewDashboard) return
    createDashboard.mutate(
      {
        title: previewDashboard.title,
        widgets: previewDashboard.widgets.map((w) => ({
          config: w.config,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Dashboard guardado')
        },
        onError: () => toast.error('Failed to save dashboard'),
      },
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 gap-2">
        <span className="truncate text-sm font-medium">{previewDashboard.title}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={createDashboard.isPending}>
            <Save className="size-4" />
            {createDashboard.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button size="icon" variant="ghost" onClick={closePreview} aria-label="Cerrar">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
        <div className="w-[100%] p-2">
          {mounted && (
            <GridLayout
              layout={layout}
              gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT }}
              dragConfig={{ enabled: false }}
              resizeConfig={{ enabled: false }}
              width={width - 16}
            >
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex flex-col rounded-lg border bg-card overflow-hidden"
                >
                  <div className="flex justify-between border-b px-3 py-2 text-xs font-medium">
                    <span className="truncate">{widget.config.title || 'Untitled widget'}</span>
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    <ReportChart
                      config={widget.config}
                      data={batchData?.get(widget.id) as Record<string, unknown>[] | undefined ?? undefined}
                      isFetching={batchFetching}
                      isError={batchData?.get(widget.id) === null}
                    />
                  </div>
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>
    </div>
  )
}
