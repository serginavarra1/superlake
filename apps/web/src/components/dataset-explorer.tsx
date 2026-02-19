import { useState } from 'react'
import { Database, Table, ChevronRight, ChevronDown, Eye, AlertCircle } from 'lucide-react'
import { useDatasets } from '@/hooks/use-datasets'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DatasetInfo } from '@/types/api'

interface SelectedTable {
  datasetId: string
  tableId: string
}

interface DatasetItemProps {
  dataset: DatasetInfo
  selectedTable: SelectedTable | null
  onSelectTable: (datasetId: string, tableId: string) => void
}

function DatasetItem({ dataset, selectedTable, onSelectTable }: DatasetItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 transition-colors mb-1"
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">{dataset.datasetId}</span>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          {dataset.tables.length}
        </span>
      </button>
      {open && (
        <div className="ml-4 border-l pl-2 flex flex-col gap-[4px]">
          {dataset.tables.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No tables</p>
          ) : (
            dataset.tables.map((table) => {
              const isSelected =
                selectedTable?.datasetId === dataset.datasetId &&
                selectedTable?.tableId === table.tableId
              return (
                <button
                  key={table.tableId}
                  onClick={() => onSelectTable(dataset.datasetId, table.tableId)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                    isSelected
                      ? 'bg-gray-50 text-accent-foreground'
                      : 'hover:bg-gray-50',
                  )}
                >
                  {table.type === 'VIEW' ? (
                    <Eye className="size-3.5 shrink-0 text-blue-500" />
                  ) : (
                    <Table className="size-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate">{table.tableId}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground shrink-0">
                    {table.type}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-1 mt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2">
          <Skeleton className="h-7 w-full" />
        </div>
      ))}
    </div>
  )
}

interface DatasetExplorerProps {
  selectedTable: SelectedTable | null
  onSelectTable: (datasetId: string, tableId: string) => void
}

export function DatasetExplorer({ selectedTable, onSelectTable }: DatasetExplorerProps) {
  const { data: datasets, isLoading, error } = useDatasets()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Database className="size-4" />
        <h2 className="text-sm font-semibold">Datasets</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && <ExplorerSkeleton />}
        {error && (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        )}
        {datasets && datasets.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No datasets found</p>
        )}
        {datasets && datasets.length > 0 && (
          <div className="space-y-1">
            {datasets.map((dataset) => (
              <DatasetItem
                key={dataset.datasetId}
                dataset={dataset}
                selectedTable={selectedTable}
                onSelectTable={onSelectTable}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}