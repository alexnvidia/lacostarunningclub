import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const api = axios.create({
    baseURL: '/',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
})

// Inyectar JWT en cada request
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auto-refresh / logout en 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            try {
                const refreshToken = useAuthStore.getState().refreshToken
                if (!refreshToken) {
                    useAuthStore.getState().logout()
                    // Solo redirigimos si NO estamos ya en una página de autenticación
                    // (evita el reload al hacer login con credenciales incorrectas)
                    const authPaths = ['/login', '/registro']
                    if (!authPaths.some(p => window.location.pathname.startsWith(p))) {
                        window.location.href = '/login'
                    }
                    return Promise.reject(error)
                }
                const { data } = await axios.post('/api/auth/refresh-token', { refresh_token: refreshToken })
                useAuthStore.getState().setToken(data.token)
                originalRequest.headers.Authorization = `Bearer ${data.token}`
                return api(originalRequest)
            } catch {
                useAuthStore.getState().logout()
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
