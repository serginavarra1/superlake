import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { shadcn } from '@clerk/themes'
import AuthLayout from './layouts/auth-layout'
import AppLayout from './layouts/app-layout'
import ProtectedRoute from './components/protected-route'
import SignInPage from './pages/sign-in'
import SignUpPage from './pages/sign-up'
import HomePage from './pages/home'
import { TokenSync } from './components/token-sync'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={{
        theme: shadcn,
      }}
    >
      <TokenSync />
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomePage />} />
            </Route>
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  )
}

export default App
