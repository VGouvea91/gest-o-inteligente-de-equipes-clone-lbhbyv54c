import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { LoadingScreen } from '@/components/loading-screen'

export default function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const { isAuthenticated, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
