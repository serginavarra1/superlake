import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BotMessageSquare, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatMessages, type ToolCall } from '@/hooks/use-chat-messages'
import { ChatInput } from '@/components/chat-input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ChatInterfaceProps {
  threadId: string | null
  onThreadCreated: (threadId: string) => void
}

export function ChatInterface({ threadId, onThreadCreated }: ChatInterfaceProps) {
  const { messages, isLoading, isStreaming, streamingParts, error, sendMessage, abortMessage } = useChatMessages({ threadId, onThreadCreated })

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Abort stream on unmount (switching conversations is handled inside the hook)
  useEffect(() => () => abortMessage(), [abortMessage])

  // Smooth scroll when a complete message is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Instant scroll during streaming to avoid queued smooth-scroll jank
  useEffect(() => {
    if (!isStreaming) return
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [streamingParts, isStreaming])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming || isLoading) return
    setInput('')
    sendMessage(text)
  }, [input, isStreaming, isLoading, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const hasMessages = messages.length > 0 || isStreaming

  const chatInputProps = {
    value: input,
    onChange: setInput,
    onKeyDown: handleKeyDown,
    onSend: handleSend,
    onAbort: abortMessage,
    isStreaming,
    disabled: isLoading,
  }

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
                  <div key={msg.id}>
                    {msg.parts ? (
                      msg.parts.map((part, i) =>
                        part.type === 'text' ? (
                          <AssistantMessage key={`${msg.id}-${i}`} content={part.content} />
                        ) : (
                          <ToolCallDisplay key={part.toolCallId} toolCalls={[part]} />
                        )
                      )
                    ) : (
                      <>
                        {msg.toolCalls && <ToolCallDisplay toolCalls={msg.toolCalls} />}
                        <AssistantMessage content={msg.content} />
                      </>
                    )}
                  </div>
                ),
              )}
            {isStreaming && (
              <>
                {streamingParts.length === 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                    Thinking…
                  </div>
                )}
                {streamingParts.length > 0 && (
                  <div>
                    {streamingParts.map((part, i) =>
                      part.type === 'text' ? (
                        <AssistantMessage
                          key={`stream-${i}`}
                          content={part.content}
                          streaming={i === streamingParts.length - 1}
                        />
                      ) : (
                        <ToolCallDisplay key={part.toolCallId} toolCalls={[part]} />
                      )
                    )}
                  </div>
                )}
              </>
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
          <ChatInput {...chatInputProps} className="w-full max-w-2xl" />
          {error && <ErrorMessage message={error.message} />}
        </div>
      )}

      {/* Docked input — only shown when there are messages */}
      {(hasMessages || isLoading) && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <ChatInput {...chatInputProps} />
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
      <div className="max-w-[70%] rounded-2xl bg-gray-50 px-4 py-2.5 text-base leading-relaxed">
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

function ToolCallDisplay({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) return null
  return (
    <div className="my-3 flex flex-col gap-1.5">
      {toolCalls.map((tc) => (
        <ToolCallItem key={tc.toolCallId} toolCall={tc} />
      ))}
    </div>
  )
}

type SchemaField = {
  name: string
  type: string
  mode: string
  description?: string
  fields?: SchemaField[]
}

function renderToolInput(toolName: string, args: Record<string, unknown>): React.ReactNode {
  switch (toolName) {
    case 'listDatasetsTool':
      return null
    case 'listTablesTool':
      return (
        <span>
          Dataset: <code className="bg-muted px-1 rounded">{String(args.datasetId ?? '')}</code>
        </span>
      )
    case 'getTableDetailsTool':
      return (
        <span>
          Table:{' '}
          <code className="bg-muted px-1 rounded">
            {String(args.datasetId ?? '')}.{String(args.tableId ?? '')}
          </code>
        </span>
      )
    case 'runReadOnlyQueryTool':
      return (
        <div className="space-y-1">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted px-2 py-1.5 text-xs">
            {String(args.query ?? '')}
          </pre>
          <span className="text-muted-foreground text-xs">
            offset {String(args.startIndex ?? 0)}, max {String(args.maxResults ?? '')} rows
          </span>
        </div>
      )
    default:
      return (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(args, null, 2)}
        </pre>
      )
  }
}

function renderToolResult(toolName: string, result: unknown): React.ReactNode {
  switch (toolName) {
    case 'listDatasetsTool': {
      const datasets = result as Array<{ datasetId: string }>
      if (!Array.isArray(datasets) || datasets.length === 0)
        return <span className="text-muted-foreground">No datasets found</span>
      return (
        <div className="flex flex-wrap gap-1">
          {datasets.map((d) => (
            <span key={d.datasetId} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {d.datasetId}
            </span>
          ))}
        </div>
      )
    }
    case 'listTablesTool': {
      const tables = result as Array<{ tableId: string; type: string }>
      if (!Array.isArray(tables) || tables.length === 0)
        return <span className="text-muted-foreground">No tables found</span>
      return (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Table</th>
              <th className="pb-1 text-left font-medium text-muted-foreground">Type</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.tableId} className="border-b border-border/50 last:border-0">
                <td className="py-0.5 pr-3 font-mono">{t.tableId}</td>
                <td className="py-0.5 text-muted-foreground">{t.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'getTableDetailsTool': {
      const details = result as {
        tableId: string
        datasetId: string
        description?: string
        schema: SchemaField[]
        rowCount: number | null
        partitioning?: { type: string; field?: string; requireFilter: boolean }
      }
      return (
        <div className="space-y-2">
          {details.description && (
            <p className="text-muted-foreground">{details.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs">
            {details.rowCount !== null && (
              <span>
                <span className="text-muted-foreground">Rows: </span>
                <span className="font-mono">{details.rowCount.toLocaleString()}</span>
              </span>
            )}
            {details.partitioning && (
              <span>
                <span className="text-muted-foreground">Partition: </span>
                <span className="font-mono">
                  {details.partitioning.type}
                  {details.partitioning.field ? ` (${details.partitioning.field})` : ''}
                </span>
              </span>
            )}
          </div>
          {Array.isArray(details.schema) && details.schema.length > 0 && (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Field</th>
                  <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Mode</th>
                  <th className="pb-1 text-left font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {details.schema.map((f) => (
                  <tr key={f.name} className="border-b border-border/50 last:border-0">
                    <td className="py-0.5 pr-3 font-mono">{f.name}</td>
                    <td className="py-0.5 pr-3 text-muted-foreground">{f.type}</td>
                    <td className="py-0.5 pr-3 text-muted-foreground">{f.mode}</td>
                    <td className="py-0.5 text-muted-foreground">{f.description ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )
    }
    case 'runReadOnlyQueryTool': {
      const { rows, totalRows } = result as { rows: Array<Record<string, unknown>>; totalRows: number }
      if (!Array.isArray(rows) || rows.length === 0)
        return <span className="text-muted-foreground">No rows returned</span>
      const columns = Object.keys(rows[0])
      return (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">{totalRows} row{totalRows !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((col) => (
                    <th key={col} className="pb-1 pr-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {columns.map((col) => (
                      <td key={col} className="py-0.5 pr-3 font-mono whitespace-nowrap">
                        {row[col] === null || row[col] === undefined
                          ? <span className="text-muted-foreground italic">null</span>
                          : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    default:
      return (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all">
          {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
        </pre>
      )
  }
}

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [open, setOpen] = useState(true)
  const inputNode = renderToolInput(toolCall.toolName, toolCall.args ?? {})
  const hasDetails = inputNode !== null || toolCall.result !== undefined

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-xs',
            'bg-muted/60 hover:bg-muted text-muted-foreground transition-colors',
            !hasDetails && 'cursor-default pointer-events-none',
          )}
        >
          {toolCall.status === 'running' ? (
            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
          ) : (
            <span className="text-green-600 shrink-0">✓</span>
          )}
          <span className="font-mono font-medium">{toolCall.toolName}</span>
          {hasDetails && (
            <ChevronDown
              className={cn(
                'ml-auto h-3 w-3 shrink-0 transition-transform duration-150',
                open && 'rotate-180',
              )}
            />
          )}
        </button>
      </CollapsibleTrigger>
      {hasDetails && (
        <CollapsibleContent>
          <div className="mt-0.5 rounded-md bg-muted/40 px-2.5 py-2 text-xs font-mono">
            {inputNode !== null && (
              <>
                <p className="mb-1 text-muted-foreground font-sans font-medium text-xs uppercase tracking-wide">
                  Input
                </p>
                <div className="font-sans py-2">{inputNode}</div>
              </>
            )}
            {toolCall.result !== undefined && (
              <>
                <p className={cn('mb-1 mt-2 text-muted-foreground font-sans font-medium text-xs uppercase tracking-wide', inputNode !== null && 'mt-2')}>
                  Result
                </p>
                <div className="font-sans py-2">
                  {renderToolResult(toolCall.toolName, toolCall.result)}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}