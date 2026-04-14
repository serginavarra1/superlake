import { useSearchParams } from 'react-router-dom'
import { ConversationsSidebar } from '@/components/layout/conversations-sidebar'
import { ChatInterface } from '@/components/chat/chat-interface'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export default function AIChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const threadId = searchParams.get('thread')

  function handleSelectThread(id: string) {
    setSearchParams({ thread: id })
  }

  function handleNewConversation() {
    setSearchParams({})
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
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
      </ResizablePanelGroup>
    </div>
  )
}
