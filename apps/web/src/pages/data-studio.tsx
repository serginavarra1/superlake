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
    <div className="h-[calc(100vh-4rem)] -m-4 -mt-0">
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
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a table to view its details.</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}