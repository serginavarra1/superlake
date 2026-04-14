import { ArrowUpDown, ArrowUp, ArrowDown, Plus, Check, Calendar, ALargeSmall, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SortField = "createdAt" | "title"
type SortOrder = "ascending" | "descending"

const fieldLabels: Record<SortField, string> = {
  createdAt: "Creation date",
  title: "Title",
}

interface DashboardsToolbarProps {
  sortField: SortField
  sortOrder: SortOrder
  onSortFieldChange: (field: SortField) => void
  onSortOrderChange: (order: SortOrder) => void
  search: string
  onSearchChange: (value: string) => void
  onNewDashboard: () => void
  isCreating: boolean
}

export function DashboardsToolbar({
  sortField,
  sortOrder,
  onSortFieldChange,
  onSortOrderChange,
  search,
  onSearchChange,
  onNewDashboard,
  isCreating,
}: DashboardsToolbarProps) {
  return (
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
            <DropdownMenuItem onClick={() => onSortFieldChange("createdAt")} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="size-3.5 text-muted-foreground" />
                Creation date
              </span>
              {sortField === "createdAt" && <Check className="size-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortFieldChange("title")} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ALargeSmall className="size-3.5 text-muted-foreground" />
                Title
              </span>
              {sortField === "title" && <Check className="size-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSortOrderChange("ascending")} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowUp className="size-3.5 text-muted-foreground" />
                Ascending
              </span>
              {sortOrder === "ascending" && <Check className="size-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortOrderChange("descending")} className="flex items-center justify-between">
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search dashboards…"
            className="h-8 pl-8 w-96"
          />
        </div>
      </div>

      <Button
        size="sm"
        className="gap-1.5"
        variant="outline"
        onClick={onNewDashboard}
        disabled={isCreating}
      >
        <Plus className="size-4" />
        New dashboard
      </Button>
    </div>
  )
}
