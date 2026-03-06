import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { createMastraClient } from '@/lib/mastra-client'

const AGENT_ID = 'analytics-agent'

export function useConversations() {
  const { isSignedIn, getToken } = useAuth()

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const token = await getToken()
      const client = createMastraClient(token!)
      const result = await client.listMemoryThreads({ agentId: AGENT_ID })
      return result.threads
    },
    enabled: !!isSignedIn,
  })
}
