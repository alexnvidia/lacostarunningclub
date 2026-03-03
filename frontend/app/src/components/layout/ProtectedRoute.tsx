import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

interface ProtectedRouteProps {
    requiredRole?: 'ADMIN' | 'SUPPORT' | 'TRAINER'
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuthStore()

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (requiredRole && user?.role !== requiredRole && user?.role !== 'ADMIN') {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
