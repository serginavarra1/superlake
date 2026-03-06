import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Calendar, LayoutGrid } from "lucide-react"
import { useDashboards, useCreateDashboard, useDeleteDashboard, useUpdateDashboard, useDuplicateDashboard } from "@/hooks/use-dashboards"
import type { Dashboard } from "@/types/api"
import { DashboardsToolbar } from "@/components/dashboards-toolbar"
import { DashboardRow } from "@/components/dashboard-row"
import { RenameDashboardDialog } from "@/components/rename-dashboard-dialog"
import { DeleteDashboardDialog } from "@/components/delete-dashboard-dialog"

type SortField = "createdAt" | "title"
type SortOrder = "ascending" | "descending"

function sortDashboards(dashboards: Dashboard[], field: SortField, order: SortOrder): Dashboard[] {
  return [...dashboards].sort((a, b) => {
    let cmp = 0
    if (field === "title") {
      cmp = a.title.localeCompare(b.title)
    } else {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    return order === "ascending" ? cmp : -cmp
  })
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("descending")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [search, setSearch] = useState("")

  const { data: dashboards = [], isLoading, isError } = useDashboards()
  const createDashboard = useCreateDashboard()
  const deleteDashboard = useDeleteDashboard()
  const updateDashboard = useUpdateDashboard()
  const duplicateDashboard = useDuplicateDashboard()

  const sorted = useMemo(() => {
    const filtered = search
      ? dashboards.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
      : dashboards
    return sortDashboards(filtered, sortField, sortOrder)
  }, [dashboards, search, sortField, sortOrder])

  async function handleNewDashboard() {
    try {
      const dashboard = await createDashboard.mutateAsync("New Dashboard")
      navigate(`/reports/${dashboard.id}`)
    } catch {
      toast.error("Failed to create dashboard")
    }
  }

  function handleRenameSubmit() {
    if (!renameId) return
    updateDashboard.mutate({ id: renameId, title: renameValue }, {
      onSuccess: () => setRenameId(null),
      onError: () => toast.error("Failed to rename dashboard"),
    })
  }

  function handleDeleteConfirm() {
    if (!deleteId) return
    deleteDashboard.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
      onError: () => toast.error("Failed to delete dashboard"),
    })
  }

  return (
    <div className="flex h-full flex-col">
      <DashboardsToolbar
        sortField={sortField}
        sortOrder={sortOrder}
        onSortFieldChange={setSortField}
        onSortOrderChange={setSortOrder}
        search={search}
        onSearchChange={setSearch}
        onNewDashboard={handleNewDashboard}
        isCreating={createDashboard.isPending}
      />

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-4 py-2 text-left font-normal">Dashboard</th>
              <th className="px-4 py-2 text-left font-normal">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Created at
                </span>
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Loading dashboards…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-destructive">
                  Failed to load dashboards.
                </td>
              </tr>
            )}
            {!isLoading && !isError && sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="py-24">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted">
                      <LayoutGrid className="size-6" />
                    </div>
                    <div className="text-center">
                      {search ? (
                        <>
                          <p className="text-sm font-medium text-foreground">No results for "{search}"</p>
                          <p className="mt-0.5 text-sm">Try a different search term.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground">No dashboards yet</p>
                          <p className="mt-0.5 text-sm">Create one to get started.</p>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {sorted.map((dashboard) => (
              <DashboardRow
                key={dashboard.id}
                dashboard={dashboard}
                onClick={() => navigate(`/reports/${dashboard.id}`)}
                onRename={() => { setRenameId(dashboard.id); setRenameValue(dashboard.title) }}
                onDuplicate={() => duplicateDashboard.mutate(dashboard.id, {
                  onError: () => toast.error("Failed to duplicate dashboard"),
                })}
                onDelete={() => setDeleteId(dashboard.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <RenameDashboardDialog
        open={!!renameId}
        onOpenChange={(open) => { if (!open) setRenameId(null) }}
        value={renameValue}
        onChange={setRenameValue}
        onSubmit={handleRenameSubmit}
        isPending={updateDashboard.isPending}
      />

      <DeleteDashboardDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onDelete={handleDeleteConfirm}
        isPending={deleteDashboard.isPending}
      />
    </div>
  )
}
