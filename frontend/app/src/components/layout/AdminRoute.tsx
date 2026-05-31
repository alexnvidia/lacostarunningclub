import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

export function AdminRoute() {
    const { isAuthenticated, user } = useAuthStore()

    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

    return <Outlet />
}
