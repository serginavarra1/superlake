import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setTokenGetter } from '@/lib/api-client'

export function useAuthToken() {
  const { getToken } = useAuth()

  useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])
}