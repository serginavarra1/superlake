import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, LayoutGrid, Check, Calendar, ALargeSmall, MoreHorizontal, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDashboards, useCreateDashboard, useDeleteDashboard } from "@/hooks/use-dashboards"
import type { Dashboard } from "@/types/api"

const COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-teal-500",
]

function dashboardColor(id: string): string {
  const code = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[code % COLORS.length]
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

type SortField = "createdAt" | "title"
type SortOrder = "ascending" | "descending"

const fieldLabels: Record<SortField, string> = {
  createdAt: "Creation date",
  title: "Title",
}

function sortDashboards(
  dashboards: Dashboard[],
  field: SortField,
  order: SortOrder,
): Dashboard[] {
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
  const [search, setSearch] = useState("")
  const { data: dashboards = [], isLoading, isError } = useDashboards()
  const createDashboard = useCreateDashboard()
  const deleteDashboard = useDeleteDashboard()

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

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5" variant="outline">
                <ArrowUpDown className="size-3.5" />
                Sorted by <span className="text-muted-foreground">{fieldLabels[sortField]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setSortField("createdAt")} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Creation date
                </span>
                {sortField === "createdAt" && <Check className="size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField("title")} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ALargeSmall className="size-3.5 text-muted-foreground" />
                  Title
                </span>
                {sortField === "title" && <Check className="size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder("ascending")} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ArrowUp className="size-3.5 text-muted-foreground" />
                  Ascending
                </span>
                {sortOrder === "ascending" && <Check className="size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("descending")} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ArrowDown className="size-3.5 text-muted-foreground" />
                  Descending
                </span>
                {sortOrder === "descending" && <Check className="size-3.5" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dashboards…"
              className="h-8 pl-8 w-96"
            />
          </div>
        </div>

        <Button
          size="sm"
          className="gap-1.5"
          variant="outline"
          onClick={handleNewDashboard}
          disabled={createDashboard.isPending}
        >
          <Plus className="size-4" />
          New dashboard
        </Button>
      </div>

      {/* Table */}
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
              <tr
                key={dashboard.id}
                className="border-b hover:bg-muted/50 cursor-pointer group"
                onClick={() => navigate(`/reports/${dashboard.id}`)}
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className={`flex size-7 items-center justify-center rounded-md ${dashboardColor(dashboard.id)} text-white shrink-0`}>
                      <LayoutGrid className="size-3.5" />
                    </span>
                    <span className="font-medium">{dashboard.title || "Untitled"}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(dashboard.createdAt)}</td>
                <td className="px-4 py-3 w-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded p-1 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(dashboard.id)
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete dashboard?</DialogTitle>
            <DialogDescription>
              This dashboard will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteDashboard.isPending}
              onClick={() => {
                if (deleteId) deleteDashboard.mutate(deleteId, {
                  onSuccess: () => setDeleteId(null),
                  onError: () => toast.error("Failed to delete dashboard"),
                })
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
