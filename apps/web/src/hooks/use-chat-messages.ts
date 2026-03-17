import { useAuth, useUser } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createMastraClient } from '@/lib/mastra-client'

const AGENT_ID = 'analytics-agent'

interface RawToolInvocation {
  state?: string
  toolCallId?: string
  toolName?: string
  args?: Record<string, unknown>
  result?: unknown
}

interface RawMessagePart {
  type: string
  text?: string
  toolInvocation?: RawToolInvocation
  // legacy flat fields (just in case)
  toolCallId?: string
  toolName?: string
  args?: Record<string, unknown>
  result?: unknown
}

interface RawMessage {
  id?: string
  role?: string
  content?: unknown
}

function extractMessageParts(raw: unknown): StreamingPart[] {
  // Unwrap Mastra format: { format, parts: [...], content: "..." }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.parts)) return extractMessageParts(obj.parts)
  }
  if (Array.isArray(raw)) {
    const parts: StreamingPart[] = []
    for (const p of raw as RawMessagePart[]) {
      if (p.type === 'text' && p.text) {
        const last = parts[parts.length - 1]
        if (last?.type === 'text') {
          parts.splice(-1, 1, { ...last, content: last.content + p.text })
        } else {
          parts.push({ type: 'text', content: p.text })
        }
      } else if (p.type === 'tool-invocation' && p.toolInvocation?.toolCallId) {
        const inv = p.toolInvocation
        parts.push({
          type: 'tool',
          toolCallId: inv.toolCallId!,
          toolName: inv.toolName ?? '',
          args: inv.args ?? {},
          result: inv.result,
          status: 'done',
        })
      }
      // 'step-start' and other unknown parts are ignored
    }
    return parts
  }
  const content = extractMessageContent(raw)
  return content ? [{ type: 'text', content }] : []
}

function extractMessageContent(raw: unknown): string {
  if (typeof raw === 'string') {
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>
          if (typeof obj.content === 'string') return obj.content
          if (Array.isArray(obj.parts)) {
            return (obj.parts as RawMessagePart[])
              .filter((p) => p.type === 'text')
              .map((p) => p.text ?? '')
              .join('')
          }
        }
      } catch { /* not JSON */ }
    }
    return raw
  }
  if (Array.isArray(raw)) {
    return (raw as RawMessagePart[])
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('')
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text
    if (typeof obj.content === 'string') return obj.content
    return ''
  }
  return String(raw ?? '')
}

export type ToolCallStatus = 'running' | 'done' | 'error'

export interface ToolCall {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result?: unknown
  status: ToolCallStatus
}

export interface TextPart {
  type: 'text'
  content: string
}

export interface ToolPart extends ToolCall {
  type: 'tool'
}

export type StreamingPart = TextPart | ToolPart

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  parts?: StreamingPart[]
}

interface UseChatMessagesOptions {
  threadId: string | null
  onThreadCreated: (threadId: string) => void
}

export function useChatMessages({ threadId, onThreadCreated }: UseChatMessagesOptions) {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingParts, setStreamingParts] = useState<StreamingPart[]>([])
  const streamingPartsRef = useRef<StreamingPart[]>([])
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isStreamingRef = useRef(false)
  const lastUserMessageIdRef = useRef<string | null>(null)
  // Tracks a thread we just created ourselves so threadId-change effects can
  // distinguish a self-initiated update from a user-initiated conversation switch.
  // Uses `undefined` (not `null`) as the "nothing pending" sentinel so it never
  // accidentally matches a threadId of `null`.
  const justCreatedThreadIdRef = useRef<string | undefined>(undefined)

  const updateStreamingParts = useCallback((updater: (prev: StreamingPart[]) => StreamingPart[]) => {
    setStreamingParts((prev) => {
      const next = updater(prev)
      streamingPartsRef.current = next
      return next
    })
  }, [])

  // Shared cleanup: aborts the current stream and rolls back the optimistic user message.
  const clearStream = useCallback((removeOptimisticMessage = false) => {
    abortRef.current?.abort()
    isStreamingRef.current = false
    setIsStreaming(false)
    setStreamingParts([])
    streamingPartsRef.current = []
    if (removeOptimisticMessage && lastUserMessageIdRef.current) {
      setMessages((prev) => prev.filter((m) => m.id !== lastUserMessageIdRef.current))
    }
    lastUserMessageIdRef.current = null
  }, [])

  // Load messages when threadId changes.
  // NOTE: Both effects below depend on `justCreatedThreadIdRef`. React guarantees
  // effects run in declaration order, so the first effect reads the flag and the
  // second resets it. Do not reorder these two effects.
  useEffect(() => {
    if (!threadId) {
      setMessages([])
      return
    }

    // Skip reload when the thread was just created by sendMessage — messages
    // are already in state from the optimistic update + streaming response.
    if (threadId === justCreatedThreadIdRef.current) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    ;(async () => {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const client = createMastraClient(token)
        const result = await client.listThreadMessages(threadId, { agentId: AGENT_ID })
        if (cancelled) return
        const msgs: ChatMessage[] = (result.messages ?? [])
          .filter((m: RawMessage) => m.role === 'user' || m.role === 'assistant')
          .map((m: RawMessage) => {
            const parts = m.role === 'assistant' ? extractMessageParts(m.content) : undefined
            return {
              id: m.id ?? crypto.randomUUID(),
              role: m.role as 'user' | 'assistant',
              content: extractMessageContent(m.content),
              parts: parts && parts.length > 0 ? parts : undefined,
            }
          })
        setMessages(msgs)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [threadId, getToken])

  // Abort any in-progress stream when the user switches to a different conversation.
  // Skip if the threadId change was caused by us creating a new thread in sendMessage.
  useEffect(() => {
    if (threadId === justCreatedThreadIdRef.current) {
      justCreatedThreadIdRef.current = undefined
      return
    }
    if (isStreamingRef.current) {
      clearStream(true)
    }
  }, [threadId, clearStream])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreamingRef.current) return

      const token = await getToken()
      if (!token) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const client = createMastraClient(token, controller.signal)
      const resourceId = user?.id ?? 'anonymous'

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
      }

      setMessages((prev) => [...prev, userMessage])
      lastUserMessageIdRef.current = userMessage.id
      isStreamingRef.current = true
      setIsStreaming(true)
      updateStreamingParts(() => [])
      setError(null)

      let activeThreadId = threadId

      try {
        if (!activeThreadId) {
          const newThread = await client.createMemoryThread({ agentId: AGENT_ID, resourceId })
          activeThreadId = newThread.id
          justCreatedThreadIdRef.current = activeThreadId
          onThreadCreated(activeThreadId)
        }

        const agent = client.getAgent(AGENT_ID)
        const response = await agent.stream(
          [{ role: 'user', content: text }],
          { memory: { thread: activeThreadId, resource: resourceId } },
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await response.processDataStream({
          onChunk: async (chunk: any) => {
            if (chunk.type === 'text-delta') {
              const deltaText: string = chunk.payload?.text ?? chunk.text ?? ''
              updateStreamingParts((prev) => {
                const last = prev[prev.length - 1]
                if (last?.type === 'text') {
                  return [...prev.slice(0, -1), { ...last, content: last.content + deltaText }]
                }
                return [...prev, { type: 'text', content: deltaText }]
              })
              return
            }
            if (chunk.type === 'tool-call') {
              const p = chunk.payload ?? chunk
              updateStreamingParts((prev) => {
                if (prev.some((part) => part.type === 'tool' && (part as ToolPart).toolCallId === p.toolCallId)) return prev
                return [...prev, { type: 'tool', toolCallId: p.toolCallId, toolName: p.toolName, args: p.args ?? {}, status: 'running' } as ToolPart]
              })
              return
            }
            if (chunk.type === 'tool-result') {
              const p = chunk.payload ?? chunk
              updateStreamingParts((prev) =>
                prev.map((part) =>
                  part.type === 'tool' && (part as ToolPart).toolCallId === p.toolCallId
                    ? { ...part, result: p.result, status: 'done' }
                    : part
                )
              )
            }
          },
        })

        if (controller.signal.aborted) return

        const parts = streamingPartsRef.current
        const textContent = parts
          .filter((p): p is TextPart => p.type === 'text')
          .map((p) => p.content)
          .join('')
        const toolCalls = parts
          .filter((p): p is ToolPart => p.type === 'tool')
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ type: _type, ...tc }) => tc as ToolCall)

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          parts: parts.length > 0 ? [...parts] : undefined,
        }
        setMessages((prev) => [...prev, assistantMessage])
        lastUserMessageIdRef.current = null
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err : new Error(String(err)))
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
      } finally {
        clearStream()
      }
    },
    [threadId, getToken, user, onThreadCreated, queryClient, clearStream, updateStreamingParts],
  )

  const abortMessage = useCallback(() => clearStream(true), [clearStream])

  return { messages, isLoading, isStreaming, streamingParts, error, sendMessage, abortMessage }
}