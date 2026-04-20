import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DeleteConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceName: string
  onDelete: () => void
  isPending: boolean
}

export function DeleteConnectionDialog({ open, onOpenChange, serviceName, onDelete, isPending }: DeleteConnectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete connection?</DialogTitle>
          <DialogDescription>
            The <span className="font-medium text-foreground capitalize">{serviceName.replace(/_/g, " ")}</span> connection will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={onDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
