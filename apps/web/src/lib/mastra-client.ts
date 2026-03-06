import { MastraClient } from '@mastra/client-js'

const MASTRA_URL = import.meta.env.VITE_MASTRA_API_URL || 'http://localhost:4111'

export function createMastraClient(token: string) {
  return new MastraClient({
    baseUrl: MASTRA_URL,
    headers: { Authorization: `Bearer ${token}` },
  })
}
