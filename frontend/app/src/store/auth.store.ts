import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
    id: string
    email: string
    firstName: string
    lastName?: string
    role: 'USER' | 'ADMIN' | 'SUPPORT' | 'TRAINER'
    emailVerified?: boolean
    avatarUrl?: string | null
}

interface AuthState {
    user: AuthUser | null
    token: string | null
    refreshToken: string | null
    isAuthenticated: boolean

    login: (token: string, refreshToken: string, user: AuthUser) => void
    logout: () => void
    setToken: (token: string) => void
    updateUser: (data: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,

            login: (token, refreshToken, user) =>
                set({ token, refreshToken, user, isAuthenticated: true }),

            logout: () =>
                set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),

            setToken: (token) => set({ token }),

            updateUser: (data) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...data } : null,
                })),
        }),
        {
            name: 'lcrc-auth',
            partialize: (state) => ({
                token: state.token,
                refreshToken: state.refreshToken,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)
