import { MoreHorizontal, Plug, RefreshCw, Trash2, ExternalLink, CheckCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item"
import { formatDate } from "@/components/dashboard/dashboard-row"
import type { FivetranConnection } from "@/types/api"

interface ConnectionRowProps {
  connection: FivetranConnection
  onCompleteSetup: (connectCardUrl: string) => void
  onFinalize: (id: string) => void
  onSync: (id: string) => void
  onDelete: (id: string) => void
}

function SetupStateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    connected: "bg-emerald-100 text-emerald-700",
    incomplete: "bg-amber-100 text-amber-700",
    broken: "bg-red-100 text-red-700",
  }
  const style = styles[state] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style}`}>
      {state}
    </span>
  )
}

export function ConnectionRow({
  connection,
  onCompleteSetup,
  onFinalize,
  onSync,
  onDelete,
}: ConnectionRowProps) {
  const isConnected = connection.setupState === "connected"

  return (
    <Item size="sm" variant={"outline"}>
      <ItemMedia variant="icon" className="h-10 w-10">
        <Plug className="size-5" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <span className="capitalize">{connection.service.replace(/_/g, " ")}</span>
          <SetupStateBadge state={connection.setupState} />
        </ItemTitle>
        <ItemDescription>
          {connection.schemaName} · {connection.syncState.replace(/_/g, " ")}
          {connection.lastSyncAt ? ` · ${formatDate(connection.lastSyncAt)}` : ""}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded p-1 hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isConnected && (
              <>
                <DropdownMenuItem
                  disabled={!connection.connectCardUrl}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (connection.connectCardUrl) {
                      onCompleteSetup(connection.connectCardUrl)
                    }
                  }}
                >
                  <ExternalLink className="size-4" />
                  Complete Setup
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onFinalize(connection.id)
                  }}
                >
                  <CheckCircle className="size-4" />
                  Finalize
                </DropdownMenuItem>
              </>
            )}
            {isConnected && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onSync(connection.id)
                }}
              >
                <RefreshCw className="size-4" />
                Sync Now
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(connection.id)
              }}
            >
              <Trash2 className="size-4 text-destructive" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  )
}
