import { LayoutGrid, MoreHorizontal, Trash2, Pencil, Copy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export function dashboardColor(id: string): string {
  const code = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[code % COLORS.length]
}

export function formatDate(iso: string): string {
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

interface DashboardRowProps {
  dashboard: Dashboard
  onClick: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function DashboardRow({ dashboard, onClick, onRename, onDuplicate, onDelete }: DashboardRowProps) {
  return (
    <tr
      className="border-b hover:bg-muted/50 cursor-pointer group"
      onClick={onClick}
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
              onClick={(e) => {
                e.stopPropagation()
                onRename()
              }}
            >
              <Pencil className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
            >
              <Copy className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="size-4 text-destructive" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
