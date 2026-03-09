import { MastraClient } from '@mastra/client-js'

const MASTRA_URL = import.meta.env.VITE_MASTRA_API_URL

if (!MASTRA_URL && import.meta.env.PROD) {
  throw new Error('VITE_MASTRA_API_URL is required in production')
}

const BASE_URL = MASTRA_URL || 'http://localhost:4111'

export function createMastraClient(token: string, signal?: AbortSignal) {
  return new MastraClient({
    baseUrl: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
    ...(signal ? { abortSignal: signal } : {}),
  })
}