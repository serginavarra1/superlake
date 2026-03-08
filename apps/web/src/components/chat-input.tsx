import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChatInputProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  disabled: boolean
  className?: string
}

export function ChatInput({ inputRef, value, onChange, onKeyDown, onSend, disabled, className }: ChatInputProps) {
  return (
    <div
      className={cn(
        'flex items-end gap-2 items-center rounded-4xl border bg-white p-2 pl-6 shadow-sm focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Message..."
        disabled={disabled}
        className="flex-1 resize-none bg-transparent text-md outline-none placeholder:text-muted-foreground disabled:opacity-50"
        style={{ maxHeight: 200, overflowY: 'auto' }}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
          value.trim() && !disabled
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed',
        )}
        aria-label="Send message"
      >
        <ArrowUp className="h-4.5 w-4.5" />
      </button>
    </div>
  )
}
