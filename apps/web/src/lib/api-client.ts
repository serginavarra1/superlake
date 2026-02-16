import type { ApiError as ApiErrorType } from '@/types/api'

type GetToken = () => Promise<string | null>

let _getToken: GetToken | null = null

export function setTokenGetter(fn: GetToken) {
  _getToken = fn
}

export class ApiError extends Error {
  status: number
  data: ApiErrorType

  constructor(status: number, data: ApiErrorType) {
    super(data.message || `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)

  if (_getToken) {
    const token = await _getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`/api${path}`, { ...init, headers })

  if (!response.ok) {
    let data: ApiErrorType
    try {
      data = await response.json()
    } catch {
      data = { message: response.statusText, statusCode: response.status }
    }
    throw new ApiError(response.status, data)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}