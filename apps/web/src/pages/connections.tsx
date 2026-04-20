import { useState } from "react"
import { toast } from "sonner"
import { Plug } from "lucide-react"
import { useConnections, useDeleteConnection, useFinalizeConnection, useSyncConnection } from "@/hooks/use-connections"
import { ConnectionRow } from "@/components/connections/connection-row"
import { ServicesSection } from "@/components/connections/services-section"
import { NewConnectionSheet } from "@/components/connections/new-connection-sheet"
import { DeleteConnectionDialog } from "@/components/connections/delete-connection-dialog"
import { ItemGroup, ItemSeparator } from "@/components/ui/item"
import type { FivetranConnection, FivetranService } from "@/types/api"

export default function ConnectionsPage() {
  const [selectedService, setSelectedService] = useState<FivetranService | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: connections = [], isLoading, isError } = useConnections()
  const deleteConnection = useDeleteConnection()
  const finalizeConnection = useFinalizeConnection()
  const syncConnection = useSyncConnection()

  const deleteTarget = deleteId ? (connections as FivetranConnection[]).find((c) => c.id === deleteId) : null

  function handleDeleteConfirm() {
    if (!deleteId) return
    deleteConnection.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
      onError: () => toast.error("Failed to delete connection"),
    })
  }

  function handleFinalize(id: string) {
    finalizeConnection.mutate(id, {
      onSuccess: () => toast.success("Connection finalized"),
      onError: () => toast.error("Failed to finalize connection"),
    })
  }

  function handleSync(id: string) {
    syncConnection.mutate(id, {
      onSuccess: () => toast.success("Sync triggered"),
      onError: () => toast.error("Failed to trigger sync"),
    })
  }

  function handleCompleteSetup(connectCardUrl: string) {
    window.open(connectCardUrl, "_blank")
  }

  const connectionList = connections as FivetranConnection[]

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full">
     <div className="flex-1 min-h-0 flex flex-col gap-8 pt-12 max-w-5xl mx-auto w-full pb-4 px-4">
      <h1 className="text-2xl font-semibold">Connections</h1>

      {/* Existing connections */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Your connections</h2>
        {isLoading && (
          <p className="text-sm text-muted-foreground py-4">Loading connections…</p>
        )}
        {isError && (
          <p className="text-sm text-destructive py-4">Failed to load connections.</p>
        )}
        {!isLoading && !isError && connectionList.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <div className="flex size-12 items-center justify-center rounded-2xl border bg-muted">
              <Plug className="size-5" />
            </div>
            <p className="text-sm">No connections yet. Add one from the services below.</p>
          </div>
        )}
        {!isLoading && !isError && connectionList.length > 0 && (
          <ItemGroup>
            {connectionList.map((connection, i) => (
              <div key={connection.id}>
                {i > 0 && <ItemSeparator />}
                <ConnectionRow
                  connection={connection}
                  onCompleteSetup={handleCompleteSetup}
                  onFinalize={handleFinalize}
                  onSync={handleSync}
                  onDelete={setDeleteId}
                />
              </div>
            ))}
          </ItemGroup>
        )}
      </div>

      {/* Available services */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Available services</h2>
        <ServicesSection onSelect={(service) => setSelectedService(service)} />
      </div>

      {selectedService && (
        <NewConnectionSheet
          open={!!selectedService}
          onOpenChange={(open) => { if (!open) setSelectedService(null) }}
          service={selectedService}
        />
      )}

      <DeleteConnectionDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        serviceName={deleteTarget?.service ?? ""}
        onDelete={handleDeleteConfirm}
        isPending={deleteConnection.isPending}
      />
     </div>
    </div>
  )
}
