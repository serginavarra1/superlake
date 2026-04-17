import { useAuth, useUser, useOrganization } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createMastraClient } from '@/lib/mastra-client'
import type { MastraClient } from '@mastra/client-js'

// ── Local interfaces for Mastra SDK methods not yet in the published types ─────
// These describe the subset of the API surface used here. If the SDK ever adds
// proper types, remove these and use the SDK types directly.

interface StreamChunk {
  type: string
  /** Some chunk types nest their data under `payload`, others put it at the top level */
  payload?: {
    toolCallId?: string
    toolName?: string
    args?: Record<string, unknown>
    result?: unknown
    text?: string
  }
  runId?: string
  text?: string
  toolCallId?: string
  toolName?: string
  args?: Record<string, unknown>
  result?: unknown
}

interface ProcessableStream {
  processDataStream(opts: { onChunk: (chunk: StreamChunk) => Promise<void> | void }): Promise<void>
  runId?: string
}

interface ApprovableAgent {
  approveToolCall(opts: { runId: string; toolCallId: string }): Promise<ProcessableStream>
  declineToolCall(opts: { runId: string; toolCallId: string }): Promise<ProcessableStream>
  stream(
    messages: Array<{ role: string; content: string }>,
    opts: { memory: { thread: string; resource: string }; maxSteps: number },
  ): Promise<ProcessableStream>
}

type PendingToolApprovals = Record<
  string,
  { toolCallId: string; runId: string; toolName: string; args: Record<string, unknown> }
>

// ── Message parsing helpers ────────────────────────────────────────────────────

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
          // Merge consecutive text parts instead of mutating with splice
          parts[parts.length - 1] = { ...last, content: last.content + p.text }
        } else {
          parts.push({ type: 'text', content: p.text })
        }
      } else if (p.type === 'tool-invocation' && p.toolInvocation?.toolCallId) {
        const inv = p.toolInvocation
        const isDeclined =
          inv.result === 'Tool call was not approved by the user' ||
          (inv.result != null &&
            typeof inv.result === 'object' &&
            (inv.result as Record<string, unknown>).approved === false)
        const status: ToolCallStatus =
          inv.state === 'call' || inv.state === 'partial-call'
            ? 'pending-approval'
            : isDeclined
              ? 'error'
              : 'done'
        parts.push({
          type: 'tool',
          toolCallId: inv.toolCallId!,
          toolName: inv.toolName ?? '',
          args: inv.args ?? {},
          result: inv.result,
          status,
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
    // Try to parse as JSON regardless of leading character — the try/catch handles non-JSON.
    // Previously guarded by startsWith('{') / startsWith('['), but that missed leading
    // whitespace and could misclassify strings that happen to start with those characters.
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
    } catch { /* not JSON — fall through and return raw string */ }
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

// ── Public types ───────────────────────────────────────────────────────────────

export type ToolCallStatus = 'running' | 'done' | 'error' | 'pending-approval'

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
  /**
   * Plain-text content derived from `parts`. Kept alongside `parts` for
   * backward-compatibility with the legacy flat message format from the API
   * (messages that arrive without a `parts` array). When `parts` is present,
   * prefer reading text from there rather than from this field.
   */
  content: string
  toolCalls?: ToolCall[]
  parts?: StreamingPart[]
}

interface UseChatMessagesOptions {
  /** The Mastra agent ID to stream from */
  agentId: string
  threadId: string | null
  onThreadCreated: (threadId: string) => void
}

type AgentInstance = ReturnType<MastraClient['getAgent']>

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useChatMessages({ agentId, threadId, onThreadCreated }: UseChatMessagesOptions) {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { user } = useUser()
  const { organization } = useOrganization()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Streaming state lives in BOTH React state (for render) and a ref (for async callbacks).
  // Rule: inside async callbacks / closures always read from the ref (avoids stale closures);
  // inside render or effects always read from state. The two are kept in sync via
  // `updateStreamingParts`, which writes both atomically inside a setState call.
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingParts, setStreamingParts] = useState<StreamingPart[]>([])
  const streamingPartsRef = useRef<StreamingPart[]>([])
  const isStreamingRef = useRef(false)

  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastUserMessageIdRef = useRef<string | null>(null)

  // Tracks a thread we just created ourselves so the threadId-change effect can
  // distinguish a self-initiated update from a user-initiated conversation switch
  // and avoid reloading history we just created.
  const justCreatedThreadIdRef = useRef<string | undefined>(undefined)

  // Approval state
  const runIdRef = useRef<string | null>(null)
  const pendingToolCallIdRef = useRef<string | null>(null)
  const agentRef = useRef<AgentInstance | null>(null)

  const updateStreamingParts = useCallback((updater: (prev: StreamingPart[]) => StreamingPart[]) => {
    setStreamingParts((prev) => {
      const next = updater(prev)
      streamingPartsRef.current = next
      return next
    })
  }, [])

  // Shared cleanup: aborts the current stream and optionally rolls back the optimistic user message.
  const clearStream = useCallback((removeOptimisticMessage = false) => {
    abortRef.current?.abort()
    isStreamingRef.current = false
    setIsStreaming(false)
    setStreamingParts([])
    streamingPartsRef.current = []
    runIdRef.current = null
    pendingToolCallIdRef.current = null
    agentRef.current = null
    if (removeOptimisticMessage && lastUserMessageIdRef.current) {
      setMessages((prev) => prev.filter((m) => m.id !== lastUserMessageIdRef.current))
    }
    lastUserMessageIdRef.current = null
  }, [])

  // Finalizes the current streaming parts into a message and resets stream state.
  const finalizeMessage = useCallback(() => {
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
    clearStream()
  }, [queryClient, clearStream])

  // Load messages when threadId changes.
  useEffect(() => {
    if (!threadId) {
      setMessages([])
      return
    }

    if (threadId === justCreatedThreadIdRef.current) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    ;(async () => {
      try {
        const token = await getToken({ template: 'agentic-workflow-token-template' })
        if (!token || cancelled) return
        const client = createMastraClient(token)
        const result = await client.listThreadMessages(threadId, { agentId })
        if (cancelled) return
        const rawMsgs: RawMessage[] = (result.messages ?? []).filter(
          (m: RawMessage) => m.role === 'user' || m.role === 'assistant',
        )
        const msgs: ChatMessage[] = rawMsgs.map((m: RawMessage) => {
          const parts = m.role === 'assistant' ? extractMessageParts(m.content) : undefined
          return {
            id: m.id ?? crypto.randomUUID(),
            role: m.role as 'user' | 'assistant',
            content: extractMessageContent(m.content),
            parts: parts && parts.length > 0 ? parts : undefined,
          }
        })

        // Check if the last assistant message has pending tool approvals.
        // If so, move it into streaming state so the approval UI is shown.
        const lastMsg = msgs[msgs.length - 1]
        const lastRaw = rawMsgs[rawMsgs.length - 1]
        const rawContent = lastRaw?.content as Record<string, unknown> | undefined
        const pendingToolApprovals = (rawContent?.metadata as Record<string, unknown> | undefined)
          ?.pendingToolApprovals as PendingToolApprovals | undefined

        if (lastMsg?.role === 'assistant' && pendingToolApprovals && Object.keys(pendingToolApprovals).length > 0) {
          const approval = Object.values(pendingToolApprovals)[0]
          const parts: StreamingPart[] = lastMsg.parts?.map((p) =>
            p.type === 'tool' && (p as ToolPart).toolCallId === approval.toolCallId
              ? ({ ...p, status: 'pending-approval' } as ToolPart)
              : p,
          ) ?? [{ type: 'tool', toolCallId: approval.toolCallId, toolName: approval.toolName, args: approval.args, status: 'pending-approval' } as ToolPart]

          setMessages(msgs.slice(0, -1))
          streamingPartsRef.current = parts
          setStreamingParts(parts)
          isStreamingRef.current = true
          setIsStreaming(true)
          runIdRef.current = approval.runId
          pendingToolCallIdRef.current = approval.toolCallId
          agentRef.current = client.getAgent(agentId)
        } else {
          setMessages(msgs)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [threadId, agentId, getToken])

  // Abort any in-progress stream when the user switches to a different conversation.
  useEffect(() => {
    if (threadId === justCreatedThreadIdRef.current) {
      justCreatedThreadIdRef.current = undefined
      return
    }
    if (isStreamingRef.current) {
      clearStream(true)
    }
  }, [threadId, clearStream])

  // Stable chunk handler used for both the initial stream and any resumed stream.
  const onChunk = useCallback(async (chunk: StreamChunk) => {
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
            ? { ...part, result: p.result, status: (part as ToolPart).status === 'error' ? 'error' : 'done' }
            : part
        )
      )
      return
    }
    if (chunk.type === 'tool-call-approval') {
      const p = chunk.payload ?? chunk
      // Capture runId (top-level on chunk per BaseChunkType) and toolCallId for approve/decline calls
      runIdRef.current = chunk.runId ?? runIdRef.current
      pendingToolCallIdRef.current = p.toolCallId ?? null
      updateStreamingParts((prev) => {
        const exists = prev.some((part) => part.type === 'tool' && (part as ToolPart).toolCallId === p.toolCallId)
        if (exists) {
          // tool-call was already emitted; upgrade its status to pending-approval
          return prev.map((part) =>
            part.type === 'tool' && (part as ToolPart).toolCallId === p.toolCallId
              ? { ...part, status: 'pending-approval' } as ToolPart
              : part
          )
        }
        return [...prev, { type: 'tool', toolCallId: p.toolCallId, toolName: p.toolName, args: p.args ?? {}, status: 'pending-approval' } as ToolPart]
      })
    }
  }, [updateStreamingParts])

  const approveToolCall = useCallback(async () => {
    const agent = agentRef.current as unknown as ApprovableAgent | null
    const runId = runIdRef.current
    const toolCallId = pendingToolCallIdRef.current
    if (!agent || !runId || !toolCallId) return

    // Optimistically mark the pending-approval tool as running
    updateStreamingParts((prev) =>
      prev.map((part) =>
        part.type === 'tool' && (part as ToolPart).status === 'pending-approval'
          ? { ...part, status: 'running' } as ToolPart
          : part
      )
    )

    try {
      const resumed = await agent.approveToolCall({ runId, toolCallId })
      await resumed.processDataStream({ onChunk })

      if (abortRef.current?.signal.aborted) return

      // Check if a new approval is pending after resuming (chained approvals)
      const hasPendingApproval = streamingPartsRef.current.some(
        (p) => p.type === 'tool' && (p as ToolPart).status === 'pending-approval'
      )
      if (hasPendingApproval) {
        // runId and toolCallId were already captured in onChunk from the new tool-call-approval chunk
        return // wait for next user action
      }

      finalizeMessage()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      clearStream()
    }
  }, [updateStreamingParts, onChunk, finalizeMessage, clearStream])

  const declineToolCall = useCallback(async () => {
    const agent = agentRef.current as unknown as ApprovableAgent | null
    const runId = runIdRef.current
    const toolCallId = pendingToolCallIdRef.current
    if (!agent || !runId || !toolCallId) return

    updateStreamingParts((prev) =>
      prev.map((part) =>
        part.type === 'tool' && (part as ToolPart).status === 'pending-approval'
          ? { ...part, status: 'error' } as ToolPart
          : part
      )
    )

    try {
      const resumed = await agent.declineToolCall({ runId, toolCallId })
      await resumed.processDataStream({ onChunk })

      if (abortRef.current?.signal.aborted) return

      const hasPendingApproval = streamingPartsRef.current.some(
        (p) => p.type === 'tool' && (p as ToolPart).status === 'pending-approval'
      )
      if (hasPendingApproval) return

      finalizeMessage()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      clearStream()
    }
  }, [updateStreamingParts, onChunk, finalizeMessage, clearStream])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreamingRef.current) return

      const token = await getToken({ template: 'agentic-workflow-token-template', skipCache: true })
      if (!token) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const client = createMastraClient(token, controller.signal)
      const resourceId = `${organization!.id}:${user!.id}`

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
          const newThread = await client.createMemoryThread({ agentId, resourceId })
          activeThreadId = newThread.id
          justCreatedThreadIdRef.current = activeThreadId
          onThreadCreated(activeThreadId)
        }

        const agent = client.getAgent(agentId) as unknown as ApprovableAgent
        agentRef.current = client.getAgent(agentId)

        const response = await agent.stream(
          [{ role: 'user', content: text }],
          { memory: { thread: activeThreadId, resource: resourceId }, maxSteps: 30 },
        )

        await response.processDataStream({ onChunk })

        if (controller.signal.aborted) return

        // Fallback: if runId wasn't captured from a chunk, try the response object
        if (!runIdRef.current) {
          runIdRef.current = response.runId ?? null
        }

        // Fallback: if a tool is still 'running' with no result, the stream suspended for approval
        // (tool-call was emitted but tool-call-approval chunk was not received yet)
        const runningWithoutResult = streamingPartsRef.current.find(
          (p) => p.type === 'tool' && (p as ToolPart).status === 'running' && (p as ToolPart).result === undefined
        ) as ToolPart | undefined
        if (runningWithoutResult && !pendingToolCallIdRef.current) {
          pendingToolCallIdRef.current = runningWithoutResult.toolCallId
          updateStreamingParts((prev) =>
            prev.map((p) =>
              p.type === 'tool' && (p as ToolPart).toolCallId === runningWithoutResult.toolCallId
                ? { ...p, status: 'pending-approval' } as ToolPart
                : p
            )
          )
        }

        // If approval is pending, keep streaming state active and wait for user action
        const hasPendingApproval = streamingPartsRef.current.some(
          (p) => p.type === 'tool' && (p as ToolPart).status === 'pending-approval'
        )
        if (hasPendingApproval) return

        finalizeMessage()
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err : new Error(String(err)))
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        clearStream()
      }
    },
    [threadId, agentId, getToken, user, onThreadCreated, onChunk, finalizeMessage, clearStream, updateStreamingParts],
  )

  const abortMessage = useCallback(() => clearStream(true), [clearStream])

  return {
    messages,
    isLoading,
    isStreaming,
    streamingParts,
    error,
    sendMessage,
    abortMessage,
    approveToolCall,
    declineToolCall,
  }
}
