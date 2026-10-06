import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/hooks/use-auth'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import NotFound from './pages/NotFound'

import Index from './pages/Index'
import Team from './pages/Team'
import Tasks from './pages/Tasks'
import Objectives from './pages/Objectives'
import AIAlerts from './pages/AIAlerts'
import Performance from './pages/Performance'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SetupPassword from './pages/SetupPassword'
import Profile from './pages/Profile'

const App = () => (
  <ThemeProvider defaultTheme="system">
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/setup-password" element={<SetupPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/alerts" element={<AIAlerts />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/chat" element={<Chat />} />
              </Route>
            </Route>

            {/* Rotas exclusivas de admin */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route element={<Layout />}>
                <Route path="/team" element={<Team />} />
                <Route path="/objectives" element={<Objectives />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
)

export default App
