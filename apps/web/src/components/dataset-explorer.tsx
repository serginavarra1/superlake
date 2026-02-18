import { useState } from 'react'
import { Database, Table, ChevronRight, ChevronDown, Eye, AlertCircle } from 'lucide-react'
import { useDatasets } from '@/hooks/use-datasets'
import { Skeleton } from '@/components/ui/skeleton'
import type { DatasetInfo } from '@/types/api'

function DatasetItem({ dataset }: { dataset: DatasetInfo }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 transition-colors"
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
        <div className="ml-4 border-l pl-2">
          {dataset.tables.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No tables
            </p>
          ) : (
            dataset.tables.map((table) => (
              <div
                key={table.tableId}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 transition-colors cursor-default"
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
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

export function DatasetExplorer() {
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
            <p className="text-xs text-muted-foreground">
              {error.message}
            </p>
          </div>
        )}
        {datasets && datasets.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No datasets found
          </p>
        )}
        {datasets && datasets.length > 0 && (
          <div className="space-y-0.5">
            {datasets.map((dataset) => (
              <DatasetItem key={dataset.datasetId} dataset={dataset} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
