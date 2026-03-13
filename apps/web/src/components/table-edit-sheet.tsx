import { useEffect, useState } from 'react'
import { useUpdateTable } from '@/hooks/use-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import type { SchemaField, TableDetails } from '@/types/api'

interface TableEditSheetProps {
  details: TableDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

function flattenFields(
  fields: SchemaField[],
  depth = 0,
  prefix = '',
): { field: SchemaField; depth: number; path: string }[] {
  return fields.flatMap((f) => {
    const path = prefix ? `${prefix}.${f.name}` : f.name
    return [
      { field: f, depth, path },
      ...(f.fields ? flattenFields(f.fields, depth + 1, path) : []),
    ]
  })
}

export function TableEditSheet({ details, open, onOpenChange }: TableEditSheetProps) {
  const [description, setDescription] = useState('')
  const [fieldDescriptions, setFieldDescriptions] = useState<Record<string, string>>({})
  const updateMutation = useUpdateTable(details.datasetId, details.tableId)

  const flatFields = flattenFields(details.schema)

  useEffect(() => {
    if (open) {
      setDescription(details.description ?? '')
      const initial: Record<string, string> = {}
      for (const { field, path } of flatFields) {
        initial[path] = field.description ?? ''
      }
      setFieldDescriptions(initial)
    }
  }, [open])

  function handleSave() {
    updateMutation.mutate(
      {
        description,
        ...(details.type === 'TABLE' && {
          fieldDescriptions: flatFields.map(({ path }) => ({
            path,
            description: fieldDescriptions[path] ?? '',
          })),
        }),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Table updated')
        },
        onError: () => toast.error('Failed to update table'),
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[36rem] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Edit table</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Table description */}
          <div className="space-y-1.5">
            <div className="text-sm font-medium">Description</div>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Describe this table…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Field descriptions — only editable for regular tables */}
          {flatFields.length > 0 && details.type === 'TABLE' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Field descriptions</div>
              <div className="rounded-lg border divide-y">
                {flatFields.map(({ field, depth, path }) => (
                  <div
                    key={path}
                    className="flex items-center gap-3 py-2 px-3 pr-3"
                  >
                    <div className="w-36 shrink-0 min-w-0" style={{ paddingLeft: `${depth * 16}px` }}>
                      <span className="font-mono text-xs font-medium truncate block">{field.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{field.type}</span>
                    </div>
                    <Input
                      className="h-7 text-xs"
                      value={fieldDescriptions[path] ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFieldDescriptions((prev) => ({ ...prev, [path]: e.target.value }))
                      }
                      placeholder="Add description…"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 shrink-0">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
