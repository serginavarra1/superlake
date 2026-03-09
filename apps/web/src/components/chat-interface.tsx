import { useCallback, useEffect, useRef, useState } from 'react'
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
  const { messages, isLoading, isStreaming, streamingContent, error, sendMessage, abortMessage } =
    useChatMessages({ threadId, onThreadCreated })

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Abort stream on unmount (switching conversations is handled inside the hook)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => abortMessage(), [])

  // Smooth scroll when a complete message is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Instant scroll during streaming to avoid queued smooth-scroll jank
  useEffect(() => {
    if (!isStreaming) return
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [streamingContent, isStreaming])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    sendMessage(text)
  }, [input, isStreaming, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const hasMessages = messages.length > 0 || isStreaming

  return (
    <div className="relative flex h-full flex-col">
      {/* Message list */}
      {(hasMessages || isLoading) ? (
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
            {isStreaming && streamingContent && (
              <AssistantMessage content={streamingContent} streaming />
            )}
            {isStreaming && !streamingContent && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      ) : (
        /* Empty state — icon, prompt, and input centered as a group */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <div className="rounded-full bg-muted p-4">
            <BotMessageSquare className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">What can I help you with?</p>
          <ChatInput
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            onAbort={abortMessage}
            isStreaming={isStreaming}
            className="w-full max-w-2xl"
          />
          {error && <ErrorMessage message={error.message} />}
        </div>
      )}

      {/* Docked input — only shown when there are messages */}
      {(hasMessages || isLoading) && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              value={input}
              onChange={setInput}
              onKeyDown={handleKeyDown}
              onSend={handleSend}
              onAbort={abortMessage}
              isStreaming={isStreaming}
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
      <div className="max-w-[70%] rounded-2xl bg-gray-100 px-4 py-2.5 text-base leading-relaxed">
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
    <p className={cn('text-base text-destructive', className)}>
      Error: {message}
    </p>
  )
}