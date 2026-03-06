import { Table2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { DatasetExplorer } from '@/components/dataset-explorer'
import { TableDetailsPanel } from '@/components/table-details-panel'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export default function DataStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const datasetId = searchParams.get('dataset')
  const tableId = searchParams.get('table')
  const selected = datasetId && tableId ? { datasetId, tableId } : null

  function handleSelectTable(datasetId: string, tableId: string) {
    setSearchParams({ dataset: datasetId, table: tableId })
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={300} minSize={200} maxSize={700}>
          <DatasetExplorer
            selectedTable={selected}
            onSelectTable={handleSelectTable}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          {selected ? (
            <TableDetailsPanel datasetId={selected.datasetId} tableId={selected.tableId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-4">
                <Table2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No table selected</p>
                <p className="text-xs text-muted-foreground mt-1">Select a table from the explorer to view its details.</p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}