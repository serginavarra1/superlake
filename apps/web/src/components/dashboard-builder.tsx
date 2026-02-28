import { useState } from "react"
import GridLayout, { useContainerWidth } from "react-grid-layout"
import type { LayoutItem } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import ReportBuilder from "@/components/report-builder"
import { Plus } from "lucide-react"

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
  const [title, setTitle] = useState("")
  const [layout, setLayout] = useState<LayoutItem[]>(initialLayout)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { width, containerRef } = useContainerWidth()

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
          placeholder="New Dashboard"
          className="bg-transparent w-96 text-sm font-medium outline-none placeholder:text-muted-foreground hover:bg-muted focus:bg-muted rounded px-1 py-1"
        />
        <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" />
          Add widget
        </Button>
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
              <div key={i} className="rounded-lg border bg-card">
                <div className="drag-handle flex cursor-grab items-center border-b px-3 py-2 text-xs font-medium active:cursor-grabbing">
                  {WIDGET_LABELS[i]}
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
