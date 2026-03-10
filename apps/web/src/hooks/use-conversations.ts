import { useAuth } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createMastraClient } from '@/lib/mastra-client'

const AGENT_ID = 'analytics-agent'

export function useDeleteConversation() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (threadId: string) => {
      const token = await getToken()
      const client = createMastraClient(token!)
      return client.getMemoryThread({ threadId, agentId: AGENT_ID }).delete()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useConversations() {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const token = await getToken()
      const client = createMastraClient(token!)
      const result = await client.listMemoryThreads({ agentId: AGENT_ID })
      return result.threads
    },
    enabled: true,
  })
}
