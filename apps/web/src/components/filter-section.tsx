import * as React from "react"
import { ListFilter, Pencil, Plus, Trash } from "lucide-react"
import { useReportConfig, useReportActions, type ReportFilter } from "@/contexts/report-builder-context"
import { Button } from "@/components/ui/button"
import { FilterDialog } from "@/components/filter-dialog"

export function FilterSection() {
  const { dataSource, filters } = useReportConfig()
  const { addFilter, updateFilter, removeFilter } = useReportActions()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingFilter, setEditingFilter] = React.useState<ReportFilter | null>(null)

  function handleAdd() {
    setEditingFilter(null)
    setDialogOpen(true)
  }

  function handleEdit(filter: ReportFilter) {
    setEditingFilter(filter)
    setDialogOpen(true)
  }

  function handleSave(filter: ReportFilter) {
    if (editingFilter) {
      updateFilter(filter)
    } else {
      addFilter(filter)
    }
    setDialogOpen(false)
  }

  return (
    <div className="px-4 py-3">
      <div className="rounded-xl border p-3">
        <p className="mb-2 text-xs text-muted-foreground">Filtrar</p>

        {filters.length > 0 && (
          <div className="mb-2 flex flex-col">
            {filters.map((filter) => (
              <div
                key={filter.id}
                className="group flex items-center gap-2 rounded-md px-1.5 py-1 mb-1 bg-muted/40 hover:bg-muted/90"
              >
                <ListFilter className="size-3.5 shrink-0 text-muted-foreground mx-1" />
                <span className="flex-1 truncate text-sm">{filter.name || "Sin nombre"}</span>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleEdit(filter)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFilter(filter.id)}
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={!dataSource}
          className="w-full justify-start text-muted-foreground"
          onClick={handleAdd}
        >
          <Plus className="mr-1 size-4" />
          Añadir filtro
        </Button>
      </div>

      <FilterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialFilter={editingFilter ?? undefined}
        onSave={handleSave}
      />
    </div>
  )
}
