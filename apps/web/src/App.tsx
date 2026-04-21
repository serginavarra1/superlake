import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { shadcn } from '@clerk/themes'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from './components/layout/error-boundary'
import { queryClient } from './lib/query-client'
import { env } from './lib/env'
import AuthLayout from './layouts/auth-layout'
import AppLayout from './layouts/app-layout'
import ProtectedRoute from './components/layout/protected-route'
import SignInPage from './pages/sign-in'
import SignUpPage from './pages/sign-up'
import HomePage from './pages/home'
import ReportsPage from './pages/reports'
import DashboardBuilder from './components/dashboard/dashboard-builder'
import AIChatPage from './pages/ai-chat'
import DataStudioPage from './pages/data-studio'
import ConnectionsPage from './pages/connections'
import ConnectionsCallbackPage from './pages/connections-callback'

function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
        appearance={{
          theme: shadcn,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              {/* Public auth routes */}
              <Route element={<AuthLayout />}>
                <Route path="/sign-in/*" element={<SignInPage />} />
                <Route path="/sign-up/*" element={<SignUpPage />} />
              </Route>

              {/* Public Fivetran Connect Card callback (opened as popup) */}
              <Route path="/data-management/connections/callback" element={<ConnectionsCallbackPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/reports/:id" element={<DashboardBuilder />} />
                  <Route path="/ai-chat" element={<AIChatPage />} />
                  <Route path="/data-management/data-studio" element={<DataStudioPage />} />
                  <Route path="/data-management/connections" element={<ConnectionsPage />} />
                </Route>
              </Route>

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/home" replace />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
        <Toaster position="bottom-center" />
      </ClerkProvider>
    </ErrorBoundary>
  )
}

export default App