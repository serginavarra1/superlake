import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { shadcn } from '@clerk/themes'
import { ErrorBoundary } from './components/error-boundary'
import { queryClient } from './lib/query-client'
import { env } from './lib/env'
import AuthLayout from './layouts/auth-layout'
import AppLayout from './layouts/app-layout'
import ProtectedRoute from './components/protected-route'
import SignInPage from './pages/sign-in'
import SignUpPage from './pages/sign-up'
import HomePage from './pages/home'
import ReportsPage from './pages/reports'
import DashboardBuilder from './components/dashboard-builder'
import AIChatPage from './pages/ai-chat'
import DataStudioPage from './pages/data-studio'
import ConnectionsPage from './pages/connections'

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
      </ClerkProvider>
    </ErrorBoundary>
  )
}

export default App