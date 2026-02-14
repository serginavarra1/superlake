type GetToken = () => Promise<string | null>

let _getToken: GetToken | null = null

export function setTokenGetter(fn: GetToken) {
  _getToken = fn
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
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

  return fetch(`/api${path}`, { ...init, headers })
}
