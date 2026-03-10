import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import GridLayout, { useContainerWidth } from "react-grid-layout"
import type { LayoutItem } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import ReportBuilder from "@/components/report-builder"
import { ReportChart } from "@/components/report-chart"
import { Plus, MoreHorizontal, Pencil, Trash2, FileBarChart, LayoutDashboard } from "lucide-react"
import { useDashboard, useUpdateDashboard, useAddWidget, useUpdateWidget, useDeleteWidget, useBatchUpdateWidgets } from "@/hooks/use-dashboards"
import { useBatchReportQuery } from "@/hooks/use-report-query"
import type { ReportConfig } from "@/contexts/report-builder-context"
import type { DashboardWidget } from "@/types/api"

const COLS = 24
const ROW_HEIGHT = 30
const DEFAULT_WIDGET_W = 12
const DEFAULT_WIDGET_H = 10

function findFirstAvailablePosition(layout: LayoutItem[], w: number, h: number): { x: number; y: number } {
  if (layout.length === 0) return { x: 0, y: 0 }

  const maxY = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0)

  const occupied = new Set<string>()
  for (const item of layout) {
    for (let row = item.y; row < item.y + item.h; row++) {
      for (let col = item.x; col < item.x + item.w; col++) {
        occupied.add(`${col},${row}`)
      }
    }
  }

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= COLS - w; x++) {
      let fits = true
      outer: for (let row = y; row < y + h; row++) {
        for (let col = x; col < x + w; col++) {
          if (occupied.has(`${col},${row}`)) {
            fits = false
            break outer
          }
        }
      }
      if (fits) return { x, y }
    }
  }

  return { x: 0, y: maxY }
}

interface WidgetCardProps {
  widget: DashboardWidget
  hovered: boolean
  onEdit: () => void
  onDelete: () => void
  queryData: unknown[] | null | undefined
  queryFetching: boolean
}

function WidgetCard({ widget, hovered, onEdit, onDelete, queryData, queryFetching }: WidgetCardProps) {
  return (
    <>
      <div className="drag-handle flex cursor-grab justify-between border-b px-3 py-2 text-xs font-medium active:cursor-grabbing">
        <span className="truncate">
          {widget.type === "report" ? widget.config.title || "Untitled widget" : "Widget"}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`ml-1 shrink-0 rounded p-0.5 hover:bg-muted transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
              <Trash2 className="size-4 text-red-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {widget.type === "report" && (
          <ReportChart
            config={widget.config}
            data={queryData as Record<string, unknown>[] | undefined ?? undefined}
            isFetching={queryFetching}
            isError={queryData === null}
          />
        )}
      </div>
    </>
  )
}

export default function DashboardBuilder() {
  const { id } = useParams<{ id: string }>()
  const { data: dashboard, error: dashboardError } = useDashboard(id ?? "")
  const updateDashboard = useUpdateDashboard()
  const addWidget = useAddWidget(id ?? "")
  const updateWidget = useUpdateWidget(id ?? "")
  const deleteWidget = useDeleteWidget(id ?? "")
  const batchUpdateWidgets = useBatchUpdateWidgets(id ?? "")

  const [title, setTitle] = useState("")
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null)
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null)
  const { width, mounted, containerRef } = useContainerWidth({ measureBeforeMount: true })

  // Ref to skip saving layout on initial load from backend
  const layoutLoadedRef = useRef(false)
  // Ref for debounced layout save timer
  const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (dashboardError) toast.error("Failed to load dashboard")
  }, [dashboardError])

  useEffect(() => {
    if (dashboard?.title !== undefined) {
      setTitle(dashboard.title)
    }
  }, [dashboard?.title])

  useEffect(() => {
    if (dashboard?.widgets) {
      layoutLoadedRef.current = false
      setLayout(dashboard.widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h })))
    }
  }, [dashboard?.widgets])

  function handleTitleBlur() {
    if (id && title !== dashboard?.title) {
      updateDashboard.mutate({ id, title }, {
        onError: () => toast.error("Failed to save title"),
      })
    }
  }

  function handleLayoutChange(newLayout: readonly LayoutItem[]) {
    setLayout([...newLayout])

    // Skip the layout change triggered by the initial load from backend
    if (!layoutLoadedRef.current) {
      layoutLoadedRef.current = true
      return
    }

    if (layoutSaveTimerRef.current) {
      clearTimeout(layoutSaveTimerRef.current)
    }

    layoutSaveTimerRef.current = setTimeout(() => {
      batchUpdateWidgets.mutate(
        newLayout.map((item) => ({ id: item.i, x: item.x, y: item.y, w: item.w, h: item.h })),
        { onError: () => toast.error("Failed to save layout") },
      )
    }, 600)
  }

  function handleSaveWidget(config: ReportConfig) {
    if (editingWidget) {
      updateWidget.mutate(
        { widgetId: editingWidget.id, config },
        {
          onSuccess: () => {
            setSheetOpen(false)
            setEditingWidget(null)
          },
          onError: () => toast.error("Failed to update widget"),
        },
      )
    } else {
      const { x, y } = findFirstAvailablePosition(layout, DEFAULT_WIDGET_W, DEFAULT_WIDGET_H)
      addWidget.mutate(
        { type: "report", config, x, y, w: DEFAULT_WIDGET_W, h: DEFAULT_WIDGET_H },
        {
          onSuccess: () => setSheetOpen(false),
          onError: () => toast.error("Failed to save widget"),
        },
      )
    }
  }

  function handleSheetClose(open: boolean) {
    if (!open) {
      setConfirmOpen(true)
    } else {
      setSheetOpen(true)
    }
  }

  function handleDiscard() {
    setConfirmOpen(false)
    setSheetOpen(false)
    setEditingWidget(null)
  }

  function handleEditWidget(widget: DashboardWidget) {
    setEditingWidget(widget)
    setSheetOpen(true)
  }

  function handleDeleteWidget(widgetId: string) {
    deleteWidget.mutate(widgetId, {
      onError: () => toast.error("Failed to delete widget"),
    })
  }

  const widgets = dashboard?.widgets ?? []
  const { data: batchData, isFetching: batchFetching, error: batchError } = useBatchReportQuery(
    widgets.map((w) => ({ id: w.id, config: w.config as ReportConfig })),
  )

  useEffect(() => {
    if (batchError) toast.error("Failed to load widget data")
  }, [batchError])

  // Ensure every widget has a layout entry — falls back to server dimensions
  // to avoid the brief window where a new widget has no matching layout item
  // and react-grid-layout would assign it a default 1x1 size.
  const effectiveLayout = widgets.map((w) => {
    const item = layout.find((l) => l.i === w.id)
    return item ?? { i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }
  })

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="New Dashboard"
          className="bg-transparent w-96 text-sm font-medium outline-none placeholder:text-muted-foreground hover:bg-muted focus:bg-muted rounded px-1 py-1"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Add widget
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setEditingWidget(null); setSheetOpen(true) }}>
              <FileBarChart className="size-4" />
              Add report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent side="right" className="w-full sm:w-[90vw] sm:max-w-[1600px] p-0" showCloseButton={true}>
          <ReportBuilder
            key={editingWidget?.id ?? "new"}
            initialConfig={editingWidget?.type === "report" ? editingWidget.config : undefined}
            onSave={handleSaveWidget}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              Your widget configuration will be lost. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Canvas */}
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
        {widgets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <LayoutDashboard className="size-10 opacity-40" />
            <p className="text-sm">No widgets yet</p>
            <Button size="sm" variant="outline" onClick={() => { setEditingWidget(null); setSheetOpen(true) }}>
              <Plus className="size-4" />
              Add widget
            </Button>
          </div>
        ) : (
          <div className="w-[100%] min-w-[900px] p-2">
            {mounted && <GridLayout
              layout={effectiveLayout}
              gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT }}
              dragConfig={{ handle: ".drag-handle" }}
              width={width - 16}
              onLayoutChange={handleLayoutChange}
            >
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex flex-col rounded-lg border bg-card overflow-hidden"
                  onMouseEnter={() => setHoveredWidget(widget.id)}
                  onMouseLeave={() => setHoveredWidget(null)}
                >
                  <WidgetCard
                    widget={widget}
                    hovered={hoveredWidget === widget.id}
                    onEdit={() => handleEditWidget(widget)}
                    onDelete={() => handleDeleteWidget(widget.id)}
                    queryData={batchData?.get(widget.id)}
                    queryFetching={batchFetching}
                  />
                </div>
              ))}
            </GridLayout>}
          </div>
        )}
      </div>
    </div>
  )
}
