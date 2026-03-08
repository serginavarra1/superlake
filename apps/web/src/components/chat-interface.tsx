import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BotMessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatMessages } from '@/hooks/use-chat-messages'
import { ChatInput } from '@/components/chat-input'

interface ChatInterfaceProps {
  threadId: string | null
  onThreadCreated: (threadId: string) => void
}

export function ChatInterface({ threadId, onThreadCreated }: ChatInterfaceProps) {
  const { messages, isLoading, isStreaming, streamingContent, error, sendMessage } =
    useChatMessages({ threadId, onThreadCreated })

  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    sendMessage(text)
  }

  const hasMessages = messages.length > 0 || isStreaming

  return (
    <div className="relative flex h-full flex-col">
      {/* Message list — only shown when there are messages */}
      {(hasMessages || isLoading) && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-12 pb-32 space-y-6">
            {isLoading && (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                ))}
              </div>
            )}
            {!isLoading &&
              messages.map((msg) =>
                msg.role === 'user' ? (
                  <UserMessage key={msg.id} content={msg.content} />
                ) : (
                  <AssistantMessage key={msg.id} content={msg.content} />
                ),
              )}
            {/* Streaming assistant message */}
            {isStreaming && streamingContent && (
              <AssistantMessage content={streamingContent} streaming />
            )}
            {/* Empty streaming indicator */}
            {isStreaming && !streamingContent && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Empty state — centered when no messages */}
      {!hasMessages && !isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <div className="rounded-full bg-muted p-4">
            <BotMessageSquare className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold">What can I help you with?</p>
          </div>
          <ChatInput
            inputRef={textareaRef}
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            disabled={isStreaming}
            className="w-full max-w-2xl"
          />
          {error && <ErrorMessage message={error.message} />}
        </div>
      )}

      {/* Bottom-docked input — shown when there are messages */}
      {(hasMessages || isLoading) && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              inputRef={textareaRef}
              value={input}
              onChange={setInput}
              onKeyDown={handleKeyDown}
              onSend={handleSend}
              disabled={isStreaming}
            />
            {error && <ErrorMessage message={error.message} className="mt-2" />}
          </div>
        </div>
      )}
    </div>
  )
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%] rounded-2xl bg-gray-100 px-4 py-2.5 text-md leading-relaxed">
        {content}
      </div>
    </div>
  )
}

function AssistantMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="prose prose-base max-w-none text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {streaming && <span className="animate-pulse">▋</span>}
    </div>
  )
}

function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <p className={cn('text-md text-destructive', className)}>
      Error: {message}
    </p>
  )
}
