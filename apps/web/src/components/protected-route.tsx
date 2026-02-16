import { useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuthToken } from '@/hooks/use-auth-token'

export default function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth()
  useAuthToken()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <LoaderCircle className="text-muted-foreground size-10 animate-spin" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-lg font-medium">Preparing your workspace</p>
          <p className="text-muted-foreground text-sm">Verifying your session, this will only take a moment...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}
