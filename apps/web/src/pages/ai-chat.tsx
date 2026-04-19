import { useSearchParams } from 'react-router-dom'
import { ConversationsSidebar } from '@/components/layout/conversations-sidebar'
import { ChatInterface } from '@/components/chat/chat-interface'
import { DashboardPreviewPanel } from '@/components/chat/dashboard-preview-panel'
import {
  DashboardPreviewProvider,
  useDashboardPreview,
} from '@/contexts/dashboard-preview-context'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

function AIChatPageInner() {
  const [searchParams, setSearchParams] = useSearchParams()
  const threadId = searchParams.get('thread')
  const { previewDashboard } = useDashboardPreview()

  function handleSelectThread(id: string) {
    setSearchParams({ thread: id })
  }

  function handleNewConversation() {
    setSearchParams({})
  }

  return (
    <div className="h-full">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={300} minSize={200} maxSize={500}>
          <ConversationsSidebar
            selectedThreadId={threadId}
            onSelectThread={handleSelectThread}
            onNewConversation={handleNewConversation}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <ChatInterface
            threadId={threadId}
            onThreadCreated={handleSelectThread}
          />
        </ResizablePanel>
        {previewDashboard && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={900} minSize={400}>
              <DashboardPreviewPanel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}

export default function AIChatPage() {
  return (
    <DashboardPreviewProvider>
      <AIChatPageInner />
    </DashboardPreviewProvider>
  )
}
