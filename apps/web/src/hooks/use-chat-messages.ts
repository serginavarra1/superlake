import { useAuth, useUser } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createMastraClient } from '@/lib/mastra-client'

const AGENT_ID = 'analytics-agent'

function extractMessageContent(raw: unknown): string {
  if (typeof raw === 'string') {
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.content === 'string') return parsed.content
        if (Array.isArray(parsed?.parts)) {
          return parsed.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text ?? '').join('')
        }
      } catch { /* not JSON */ }
    }
    return raw
  }
  if (Array.isArray(raw)) {
    return raw.filter((p: any) => p.type === 'text').map((p: any) => p.text ?? '').join('')
  }
  if (typeof raw === 'object' && raw !== null) {
    return (raw as any).text ?? (raw as any).content ?? JSON.stringify(raw)
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

  // Load messages when threadId changes
  useEffect(() => {
    if (!threadId) {
      setMessages([])
      return
    }

    if (isStreamingRef.current) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getToken().then(async (token) => {
      if (!token || cancelled) return
      try {
        const client = createMastraClient(token)
        const result = await client.listThreadMessages(threadId, { agentId: AGENT_ID })
        if (cancelled) return
        const msgs: ChatMessage[] = (result.messages ?? [])
          .filter((m: any) => m.role === 'user' || m.role === 'assistant')
          .map((m: any) => ({
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
    })

    return () => {
      cancelled = true
    }
  }, [threadId, getToken])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return

      const token = await getToken()
      if (!token) return

      const client = createMastraClient(token)
      const resourceId = user?.id ?? 'anonymous'

      // Abort any existing stream
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
      }

      setMessages((prev) => [...prev, userMessage])
      isStreamingRef.current = true
      setIsStreaming(true)
      setStreamingContent('')
      setError(null)

      let activeThreadId = threadId

      try {
        // Create a new thread if none is selected
        if (!activeThreadId) {
          const newThread = await client.createMemoryThread({
            agentId: AGENT_ID,
            resourceId,
          })
          activeThreadId = newThread.id
          onThreadCreated(activeThreadId)
        }

        const agent = client.getAgent(AGENT_ID)
        const response = await agent.stream(
          [{ role: 'user', content: text }],
          { memory: { thread: activeThreadId, resource: resourceId } },
        )

        let accumulated = ''
        await response.processDataStream({
          onChunk: async (chunk: any) => {
            if (chunk.type === 'text-delta') {
              accumulated += chunk.payload.text
              setStreamingContent(accumulated)
            }
          },
        })

        // Commit streamed message
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingContent('')
        // Refresh sidebar so the auto-generated title appears
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err : new Error(String(err)))
        // Remove the optimistic user message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
      } finally {
        isStreamingRef.current = false
      setIsStreaming(false)
      }
    },
    [threadId, isStreaming, getToken, user, onThreadCreated, queryClient],
  )

  return { messages, isLoading, isStreaming, streamingContent, error, sendMessage }
}
