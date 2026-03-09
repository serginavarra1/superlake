import { memo, useEffect, useRef } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onAbort: () => void
  isStreaming: boolean
  className?: string
}

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onKeyDown,
  onSend,
  onAbort,
  isStreaming,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  return (
    <div
      className={cn(
        'flex items-end items-center gap-2 rounded-4xl border bg-white p-2 pl-6 shadow-sm focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Message..."
        disabled={isStreaming}
        className="flex-1 resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-50"
        style={{ maxHeight: 200, overflowY: 'auto' }}
      />
      {isStreaming ? (
        <button
          onClick={onAbort}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Stop generating"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
            value.trim()
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
          aria-label="Send message"
        >
          <ArrowUp className="h-4.5 w-4.5" />
        </button>
      )}
    </div>
  )
})