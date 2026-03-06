import { MessageSquare, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useConversations } from '@/hooks/use-conversations'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ConversationsSidebarProps {
  selectedThreadId: string | null
  onSelectThread: (threadId: string) => void
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 mt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )
}

export function ConversationsSidebar({ selectedThreadId, onSelectThread }: ConversationsSidebarProps) {
  const { data: threads, isLoading, error } = useConversations()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="size-4" />
        <h2 className="text-sm font-semibold">Conversations</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && <SidebarSkeleton />}
        {error && (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        )}
        {threads && threads.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No conversations yet</p>
        )}
        {threads && threads.length > 0 && (
          <div className="space-y-1">
            {threads.map((thread) => {
              const isSelected = selectedThreadId === thread.id
              return (
                <button
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-sm transition-colors text-left',
                    isSelected
                      ? 'bg-gray-100 text-accent-foreground'
                      : 'hover:bg-gray-50',
                  )}
                >
                  <span className="truncate w-full font-medium">
                    {thread.title || 'Untitled conversation'}
                  </span>
                  {thread.createdAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
