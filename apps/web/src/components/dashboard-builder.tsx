import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import GridLayout, { useContainerWidth } from "react-grid-layout"
import type { LayoutItem } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import ReportBuilder from "@/components/report-builder"
import { Plus, MoreHorizontal, Pencil, Trash2, FileBarChart } from "lucide-react"
import { useDashboard, useUpdateDashboard } from "@/hooks/use-dashboards"

const COLS = 24
const ROW_HEIGHT = 30

const initialLayout: LayoutItem[] = [
  { i: "widget-1", x: 0,  y: 0,  w: 8,  h: 8  },
  { i: "widget-2", x: 8,  y: 0,  w: 8,  h: 8  },
  { i: "widget-3", x: 16, y: 0,  w: 8,  h: 8  },
  { i: "widget-4", x: 0,  y: 8,  w: 12, h: 10 },
  { i: "widget-5", x: 12, y: 8,  w: 12, h: 10 },
]

const WIDGET_LABELS: Record<string, string> = {
  "widget-1": "Total revenue",
  "widget-2": "Active users",
  "widget-3": "Conversion rate",
  "widget-4": "Sales over time",
  "widget-5": "Top channels",
}

export default function DashboardBuilder() {
  const { id } = useParams<{ id: string }>()
  const { data: dashboard } = useDashboard(id ?? "")
  const updateDashboard = useUpdateDashboard()

  const [title, setTitle] = useState("")
  const [layout, setLayout] = useState<LayoutItem[]>(initialLayout)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null)
  const { width, containerRef } = useContainerWidth()

  useEffect(() => {
    if (dashboard?.title !== undefined) {
      setTitle(dashboard.title)
    }
  }, [dashboard?.title])

  function handleTitleBlur() {
    if (id && title !== dashboard?.title) {
      updateDashboard.mutate({ id, title })
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
  }

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
            <DropdownMenuItem onSelect={() => setSheetOpen(true)}>
              <FileBarChart className="size-4" />
              Add report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent side="right" className="w-full sm:w-[90vw] sm:max-w-[1600px] p-0" showCloseButton={true}>
          <ReportBuilder />
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
        <div ref={containerRef} className="min-w-[1200px] p-2">
          <GridLayout
            layout={layout}
            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT }}
            dragConfig={{ handle: ".drag-handle" }}
            width={width}
            onLayoutChange={(l) => setLayout([...l])}
          >
            {initialLayout.map(({ i }) => (
              <div
                key={i}
                className="rounded-lg border bg-card"
                onMouseEnter={() => setHoveredWidget(i)}
                onMouseLeave={() => setHoveredWidget(null)}
              >
                <div className="drag-handle flex cursor-grab items-center justify-between border-b px-3 py-2 text-xs font-medium active:cursor-grabbing">
                  {WIDGET_LABELS[i]}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`rounded p-0.5 hover:bg-muted transition-opacity ${hoveredWidget === i ? "opacity-100" : "opacity-0"}`}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="size-4 text-red-500" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex h-full items-center justify-center p-4">
                  <p className="text-muted-foreground text-sm">Empty widget</p>
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      </div>
    </div>
  )
}
