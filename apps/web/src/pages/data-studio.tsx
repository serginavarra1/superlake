import { DatasetExplorer } from '@/components/dataset-explorer'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export default function DataStudioPage() {
  return (
    <div className="h-[calc(100vh-4rem)] -m-4 -mt-0">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={300} minSize={200} maxSize={700}>
          <DatasetExplorer />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div className="flex-1 p-4">
            <p className="text-sm text-muted-foreground">
              Select a table to explore its data.
            </p>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
