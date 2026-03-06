import { BotMessageSquare } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ConversationsSidebar } from '@/components/conversations-sidebar'
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

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={300} minSize={200} maxSize={500}>
          <ConversationsSidebar
            selectedThreadId={threadId}
            onSelectThread={handleSelectThread}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          {threadId ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-4">
                <BotMessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Conversation selected</p>
                <p className="text-xs text-muted-foreground mt-1">Chat interface coming soon.</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-4">
                <BotMessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No conversation selected</p>
                <p className="text-xs text-muted-foreground mt-1">Select a conversation from the sidebar or start a new one.</p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
