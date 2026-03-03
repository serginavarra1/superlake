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
import { useDashboard, useUpdateDashboard, useAddWidget, useUpdateWidget, useDeleteWidget } from "@/hooks/use-dashboards"
import { useReportQuery } from "@/hooks/use-report-query"
import type { ReportConfig } from "@/contexts/report-builder-context"
import type { DashboardWidget } from "@/types/api"

const COLS = 24
const ROW_HEIGHT = 30

interface WidgetCardProps {
  widget: DashboardWidget
  hovered: boolean
  onEdit: () => void
  onDelete: () => void
}

function WidgetCard({ widget, hovered, onEdit, onDelete }: WidgetCardProps) {
  const { data, isFetching, isError } = useReportQuery(
    widget.type === "report" ? widget.config : ({} as ReportConfig),
  )

  return (
    <>
      <div className="drag-handle flex cursor-grab items-center justify-between border-b px-3 py-2 text-xs font-medium active:cursor-grabbing">
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
      <div className="flex-1 min-h-0">
        {widget.type === "report" && (
          <ReportChart config={widget.config} data={data} isFetching={isFetching} isError={isError} />
        )}
      </div>
    </>
  )
}

export default function DashboardBuilder() {
  const { id } = useParams<{ id: string }>()
  const { data: dashboard } = useDashboard(id ?? "")
  const updateDashboard = useUpdateDashboard()
  const addWidget = useAddWidget(id ?? "")
  const updateWidget = useUpdateWidget(id ?? "")
  const deleteWidget = useDeleteWidget(id ?? "")

  const [title, setTitle] = useState("")
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null)
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null)
  const { width, containerRef } = useContainerWidth()

  // Ref to skip saving layout on initial load from backend
  const layoutLoadedRef = useRef(false)
  // Ref for debounced layout save timer
  const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      newLayout.forEach((item) => {
        updateWidget.mutate(
          { widgetId: item.i, x: item.x, y: item.y, w: item.w, h: item.h },
          { onError: () => toast.error("Failed to save layout") },
        )
      })
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
      const nextY = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0)
      addWidget.mutate(
        { type: "report", config, x: 0, y: nextY, w: 12, h: 10 },
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
      <div className="min-h-0 flex-1 overflow-auto">
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
          <div ref={containerRef} className="min-w-[1200px] p-2">
            <GridLayout
              layout={layout}
              gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT }}
              dragConfig={{ handle: ".drag-handle" }}
              width={width}
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
                  />
                </div>
              ))}
            </GridLayout>
          </div>
        )}
      </div>
    </div>
  )
}
