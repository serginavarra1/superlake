import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { useDatasets, useCreateTable, useCreateTableFromFile, useExcelMeta } from '@/hooks/use-datasets'
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
import type { SchemaField } from '@/types/api'

type SourceMode = 'empty' | 'csv' | 'excel' | 'json'

const BQ_TYPES = ['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP', 'JSON']
const BQ_MODES = ['NULLABLE', 'REQUIRED', 'REPEATED']

const FILE_SIZE_LIMITS: Record<string, number> = {
  csv: 1 * 1024 * 1024 * 1024,
  excel: 100 * 1024 * 1024,
  json: 100 * 1024 * 1024,
}

function fileSizeLimitLabel(mode: SourceMode) {
  const limit = FILE_SIZE_LIMITS[mode]
  if (!limit) return null
  return limit >= 1024 * 1024 * 1024
    ? `${limit / (1024 * 1024 * 1024)} GB`
    : `${limit / (1024 * 1024)} MB`
}

interface TableCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TableCreateSheet({ open, onOpenChange }: TableCreateSheetProps) {
  const { data: datasets } = useDatasets()
  const createTable = useCreateTable()
  const createFromFile = useCreateTableFromFile()
  const excelMeta = useExcelMeta()

  const [mode, setMode] = useState<SourceMode>('empty')
  const [datasetId, setDatasetId] = useState('')
  const [tableId, setTableId] = useState('')
  const [description, setDescription] = useState('')

  // empty mode schema
  const [fields, setFields] = useState<SchemaField[]>([
    { name: '', type: 'STRING', mode: 'NULLABLE' },
  ])

  // file mode
  const [file, setFile] = useState<File | null>(null)
  const [fileSizeError, setFileSizeError] = useState<string | null>(null)
  const [excelSheets, setExcelSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [startRow, setStartRow] = useState(1)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setMode('empty')
      setDatasetId('')
      setTableId('')
      setDescription('')
      setFields([{ name: '', type: 'STRING', mode: 'NULLABLE' }])
      setFile(null)
      setFileSizeError(null)
      setExcelSheets([])
      setSelectedSheet('')
      setStartRow(1)
    }
  }, [open])

  // Auto-detect Excel sheets when file is selected
  useEffect(() => {
    if (mode === 'excel' && file) {
      excelMeta.mutate(
        { file },
        {
          onSuccess: (data) => {
            setExcelSheets(data.sheets)
            setSelectedSheet(data.sheets[0] ?? '')
          },
          onError: () => toast.error('Failed to read Excel file'),
        },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, mode])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setExcelSheets([])
    setSelectedSheet('')
    if (f && mode !== 'empty') {
      const limit = FILE_SIZE_LIMITS[mode]
      setFileSizeError(f.size > limit ? `File exceeds the ${fileSizeLimitLabel(mode)} limit for ${mode.toUpperCase()} files` : null)
    } else {
      setFileSizeError(null)
    }
  }

  function addField() {
    setFields((prev) => [...prev, { name: '', type: 'STRING', mode: 'NULLABLE' }])
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  function updateField(index: number, patch: Partial<SchemaField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const isPending = createTable.isPending || createFromFile.isPending

  function canSubmit() {
    if (!datasetId || !tableId.trim()) return false
    if (mode === 'empty') {
      return fields.length > 0 && fields.every((f) => f.name.trim() !== '')
    }
    if (!file || fileSizeError) return false
    if (mode === 'excel') return excelSheets.length > 0 && selectedSheet !== ''
    return true
  }

  function handleCreate() {
    if (!canSubmit()) return

    if (mode === 'empty') {
      createTable.mutate(
        { datasetId, tableId: tableId.trim(), schema: fields, description: description || undefined },
        {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Table created')
          },
          onError: (err) => toast.error(err.message ?? 'Failed to create table'),
        },
      )
    } else {
      createFromFile.mutate(
        {
          datasetId,
          file: file!,
          tableId: tableId.trim(),
          fileType: mode,
          description: description || undefined,
          sheet: mode === 'excel' ? selectedSheet : undefined,
          startRow: mode === 'excel' ? startRow : undefined,
        },
        {
          onSuccess: ({ rowCount }) => {
            onOpenChange(false)
            toast.success(`Table created with ${rowCount.toLocaleString()} rows`)
          },
          onError: (err) => toast.error(err.message ?? 'Failed to create table'),
        },
      )
    }
  }

  const accept =
    mode === 'csv' ? '.csv' : mode === 'excel' ? '.xlsx,.xls' : '.json'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[42rem] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>New table</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Dataset */}
          <div className="space-y-1.5">
            <div className="text-sm font-medium">
              Dataset <span className="text-destructive">*</span>
            </div>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {(datasets ?? []).map((ds) => (
                  <SelectItem key={ds.datasetId} value={ds.datasetId}>
                    {ds.datasetId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table ID */}
          <div className="space-y-1.5">
            <div className="text-sm font-medium">
              Table ID <span className="text-destructive">*</span>
            </div>
            <Input
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="my_table"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="text-sm font-medium">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this table…"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <div className="text-sm font-medium">Source</div>
            <Select
              value={mode}
              onValueChange={(v) => {
                setMode(v as SourceMode)
                setFile(null)
                setFileSizeError(null)
                setExcelSheets([])
                setSelectedSheet('')
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">Empty</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Empty mode: schema builder */}
          {mode === 'empty' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Schema</div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(i, { name: e.target.value })}
                      placeholder="field_name"
                      className="flex-1"
                    />
                    <Select value={field.type} onValueChange={(v) => updateField(i, { type: v })}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BQ_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={field.mode} onValueChange={(v) => updateField(i, { mode: v })}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BQ_MODES.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeField(i)}
                      disabled={fields.length === 1}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addField} className="mt-1">
                <Plus className="size-3.5" />
                Add field
              </Button>
            </div>
          )}

          {/* File modes */}
          {mode !== 'empty' && (
            <div className="space-y-3">
              <div className="text-sm font-medium">File</div>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-sm text-muted-foreground hover:border-ring hover:text-foreground transition-colors"
              >
                <Upload className="size-5" />
                {file ? (
                  <span className="font-medium text-foreground">
                    {file.name} <span className="text-muted-foreground font-normal">({formatBytes(file.size)})</span>
                  </span>
                ) : (
                  <span>Click to select a {mode.toUpperCase()} file</span>
                )}
              </button>
              {fileSizeError ? (
                <p className="text-xs text-destructive">{fileSizeError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Max file size: {fileSizeLimitLabel(mode)}
                </p>
              )}

              {/* Excel-specific options */}
              {mode === 'excel' && file && (
                <div className="space-y-3 pt-1">
                  {excelMeta.isPending && (
                    <p className="text-xs text-muted-foreground">Reading sheets…</p>
                  )}
                  {excelSheets.length > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <div className="text-sm font-medium">Sheet</div>
                        <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {excelSheets.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-sm font-medium">Header row</div>
                        <Input
                          type="number"
                          min={1}
                          value={startRow}
                          onChange={(e) => setStartRow(parseInt(e.target.value, 10) || 1)}
                          className="w-28"
                        />
                        <p className="text-xs text-muted-foreground">
                          The row number that contains the column headers.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 shrink-0 border-t">
          <Button onClick={handleCreate} disabled={!canSubmit() || isPending}>
            {isPending ? 'Creating…' : 'Create'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
