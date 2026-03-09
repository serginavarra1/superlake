import { useAuth, useUser } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createMastraClient } from '@/lib/mastra-client'

const AGENT_ID = 'analytics-agent'

interface RawMessagePart {
  type: string
  text?: string
}

interface RawMessage {
  id?: string
  role?: string
  content?: unknown
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
    return JSON.stringify(raw)
  }
  return String(raw ?? '')
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
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
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isStreamingRef = useRef(false)
  const lastUserMessageIdRef = useRef<string | null>(null)
  // Tracks a thread we just created ourselves so threadId-change effects can
  // distinguish a self-initiated update from a user-initiated conversation switch.
  // Uses `undefined` (not `null`) as the "nothing pending" sentinel so it never
  // accidentally matches a threadId of `null`.
  const justCreatedThreadIdRef = useRef<string | undefined>(undefined)

  // Shared cleanup: aborts the current stream and rolls back the optimistic user message.
  const clearStream = useCallback((removeOptimisticMessage = false) => {
    abortRef.current?.abort()
    isStreamingRef.current = false
    setIsStreaming(false)
    setStreamingContent('')
    if (removeOptimisticMessage && lastUserMessageIdRef.current) {
      setMessages((prev) => prev.filter((m) => m.id !== lastUserMessageIdRef.current))
    }
    lastUserMessageIdRef.current = null
  }, [])

  // Load messages when threadId changes
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
          .map((m: RawMessage) => ({
            id: m.id ?? crypto.randomUUID(),
            role: m.role as 'user' | 'assistant',
            content: extractMessageContent(m.content),
          }))
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
      setStreamingContent('')
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

        let accumulated = ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await response.processDataStream({
          onChunk: async (chunk: any) => {
            if (chunk.type === 'text-delta') {
              accumulated += chunk.payload?.text ?? ''
              setStreamingContent(accumulated)
            }
          },
        })

        if (controller.signal.aborted) return

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingContent('')
        lastUserMessageIdRef.current = null
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err : new Error(String(err)))
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        setStreamingContent('')
      } finally {
        isStreamingRef.current = false
        setIsStreaming(false)
      }
    },
    [threadId, getToken, user, onThreadCreated, queryClient, clearStream],
  )

  const abortMessage = useCallback(() => clearStream(true), [clearStream])

  return { messages, isLoading, isStreaming, streamingContent, error, sendMessage, abortMessage }
}