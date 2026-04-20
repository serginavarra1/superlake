import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plug, ExternalLink, Loader2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateConnection, useFinalizeConnection } from "@/hooks/use-connections"
import type { FivetranService } from "@/types/api"

type Step = "connect" | "setup"

interface NewConnectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: FivetranService
}

function defaultSchemaName(service: FivetranService) {
  return service.id.replace(/[^a-z0-9_]/gi, "_").slice(0, 63)
}

export function NewConnectionSheet({ open, onOpenChange, service }: NewConnectionSheetProps) {
  const [step, setStep] = useState<Step>("connect")
  const [schemaName, setSchemaName] = useState(defaultSchemaName(service))
  const [syncFrequency, setSyncFrequency] = useState(360)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [connectCardUrl, setConnectCardUrl] = useState<string | null>(null)
  const [schemaError, setSchemaError] = useState("")

  const createConnection = useCreateConnection()
  const finalizeConnection = useFinalizeConnection()

  useEffect(() => {
    if (open) {
      setStep("connect")
      setSchemaName(defaultSchemaName(service))
      setSyncFrequency(360)
      setConnectionId(null)
      setConnectCardUrl(null)
      setSchemaError("")
    }
  }, [open, service])

  function validateSchema(value: string) {
    if (!/^[a-z_][a-z0-9_]{0,62}$/i.test(value)) {
      setSchemaError("Must start with a letter or underscore and contain only letters, digits, or underscores (max 63 chars)")
      return false
    }
    setSchemaError("")
    return true
  }

  async function handleCreate() {
    if (!validateSchema(schemaName)) return

    try {
      const result = await createConnection.mutateAsync({
        service: service.id,
        schemaName,
        syncFrequency,
      })
      setConnectionId(result.connectionId)
      setConnectCardUrl(result.connectCardUrl)
      setStep("setup")
    } catch {
      toast.error("Failed to create connection")
    }
  }

  async function handleFinalize() {
    if (!connectionId) return
    try {
      await finalizeConnection.mutateAsync(connectionId)
      toast.success("Connection finalized")
      onOpenChange(false)
    } catch {
      toast.error("Failed to finalize connection")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col">
        {step === "connect" && (
          <>
            <SheetHeader>
              <SheetTitle>Configure {service.name}</SheetTitle>
              <SheetDescription>Set up your connection details.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 px-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="schema-name">Schema Name</Label>
                <Input
                  id="schema-name"
                  value={schemaName}
                  onChange={(e) => {
                    setSchemaName(e.target.value)
                    if (schemaError) validateSchema(e.target.value)
                  }}
                  placeholder="my_schema"
                />
                {schemaError && <p className="text-xs text-destructive">{schemaError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sync-frequency">Sync every (minutes)</Label>
                <Input
                  id="sync-frequency"
                  type="number"
                  min={5}
                  max={1440}
                  value={syncFrequency}
                  onChange={(e) => setSyncFrequency(Number(e.target.value))}
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                onClick={handleCreate}
                disabled={createConnection.isPending || !schemaName}
              >
                {createConnection.isPending && <Loader2 className="size-4 animate-spin" />}
                Create Connection
              </Button>
            </SheetFooter>
          </>
        )}

        {step === "setup" && (
          <>
            <SheetHeader>
              <SheetTitle>Connector Created</SheetTitle>
              <SheetDescription>
                Complete the setup by opening the Fivetran wizard, then finalize to activate syncing.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
              <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted">
                <Plug className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Open the setup wizard to authorize your data source, then come back and click "I've completed setup".
              </p>
              {connectCardUrl && (
                <Button
                  className="w-full"
                  onClick={() => window.open(connectCardUrl, "_blank")}
                >
                  <ExternalLink className="size-4" />
                  Open Setup Wizard
                </Button>
              )}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setStep("connect")}>
                Back
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={finalizeConnection.isPending}
              >
                {finalizeConnection.isPending && <Loader2 className="size-4 animate-spin" />}
                I've completed setup
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
