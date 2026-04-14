import { MessageSquare, AlertCircle, Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import { useConversations, useDeleteConversation } from '@/hooks/use-conversations'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ConversationsSidebarProps {
  selectedThreadId: string | null
  onSelectThread: (threadId: string) => void
  onNewConversation: () => void
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 mt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2">
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

export function ConversationsSidebar({ selectedThreadId, onSelectThread, onNewConversation }: ConversationsSidebarProps) {
  const { data: threads, isLoading, error } = useConversations()
  const deleteConversation = useDeleteConversation()

  function handleDelete(threadId: string) {
    deleteConversation.mutate(threadId, {
      onSuccess: () => {
        if (selectedThreadId === threadId) {
          onNewConversation()
        }
      },
      onError: () => toast.error('Failed to delete conversation'),
    })
  }

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
                <div key={thread.id} className="group relative flex items-center">
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-sm transition-colors text-left pr-8',
                      isSelected
                        ? 'bg-gray-50 text-accent-foreground'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    <span className="truncate w-full">
                      {thread.title || 'Untitled conversation'}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="absolute right-1 rounded-md p-1 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(thread.id)
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="p-2 border-t">
        <Button
          onClick={onNewConversation}
          className='w-full'
        >
          <Plus className="size-4" />
          New conversation
        </Button>
      </div>
    </div>
  )
}
