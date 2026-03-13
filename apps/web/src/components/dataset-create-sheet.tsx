import { useEffect, useState } from 'react'
import { useCreateDataset } from '@/hooks/use-datasets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const LOCATIONS = [
  { value: 'US', label: 'US (multi-region)' },
  { value: 'EU', label: 'EU (multi-region)' },
]

interface DatasetCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DatasetCreateSheet({ open, onOpenChange }: DatasetCreateSheetProps) {
  const [datasetId, setDatasetId] = useState('')
  const [location, setLocation] = useState('US')
  const [description, setDescription] = useState('')
  const createMutation = useCreateDataset()

  useEffect(() => {
    if (open) {
      setDatasetId('')
      setLocation('US')
      setDescription('')
    }
  }, [open])

  function handleCreate() {
    if (!datasetId.trim()) return
    createMutation.mutate(
      { datasetId: datasetId.trim(), location, description: description || undefined },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Dataset created')
        },
        onError: () => toast.error('Failed to create dataset'),
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[36rem] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>New dataset</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-1.5">
            <div className="text-sm font-medium">
              Dataset ID <span className="text-destructive">*</span>
            </div>
            <Input
              value={datasetId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDatasetId(e.target.value)}
              placeholder="my_dataset"
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, and underscores only.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="text-sm font-medium">Location</div>
            <Select value={location} onValueChange={setLocation} >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-sm font-medium">Description</div>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Describe this dataset…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        <SheetFooter className="px-6 py-4 shrink-0">
          <Button onClick={handleCreate} disabled={!datasetId.trim() || createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
