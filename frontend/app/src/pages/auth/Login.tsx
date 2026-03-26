import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Activity, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuthStore()

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    })

    const loginMutation = useMutation({
        mutationFn: (data: LoginForm) =>
            api.post('/api/auth/login', data).then(r => r.data),
        onSuccess: (data) => {
            login(data.token, data.refresh_token, {
                id: data.user.id,
                email: data.user.email,
                firstName: data.user.first_name,
                lastName: data.user.last_name,
                role: data.user.role,
                emailVerified: data.user.email_verified,
            })
            navigate('/dashboard')
        },
    })

    const errorMsg = loginMutation.error
        ? (loginMutation.error as { response?: { data?: { code?: string } } })?.response?.data?.code === 'ACCOUNT_LOCKED'
            ? 'Cuenta bloqueada temporalmente por múltiples intentos fallidos.'
            : 'Email o contraseña incorrectos.'
        : null

    return (
        <div className="min-h-screen bg-[var(--t-bg)] flex items-center justify-center px-4">
            {/* Background blur */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--t-accent)]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md">
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-10">
                    <Activity className="w-6 h-6 text-[var(--t-accent)]" />
                    <span className="font-bold text-[var(--t-fg)] text-xl">LCRC<span className="text-[var(--t-accent)]">.</span></span>
                </Link>

                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-8">
                    <h1 className="text-2xl font-bold text-[var(--t-fg)] mb-1">Bienvenido de nuevo</h1>
                    <p className="text-[var(--t-fg-dimmed)] text-sm mb-8">Inicia sesión en tu cuenta LCRC</p>

                    <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Email</label>
                            <input
                                {...register('email')}
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="tu@email.com"
                                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-4 py-3 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none transition-colors text-sm"
                            />
                            {errors.email && <p className="text-[var(--t-accent)] text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="text-sm font-medium text-[var(--t-fg)]">Contraseña</label>
                                <Link to="/recuperar-contrasena" className="text-xs text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg)] transition-colors">
                                    ¿Olvidaste la contraseña?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    {...register('password')}
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-4 py-3 pr-10 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none transition-colors text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg)]"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-[var(--t-accent)] text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        {/* Error */}
                        {errorMsg && (
                            <div className="bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-lg px-4 py-3">
                                <p className="text-[var(--t-accent)] text-sm">{errorMsg}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="w-full bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-50 text-[var(--t-fg)] font-semibold py-3 rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {loginMutation.isPending ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : 'Iniciar sesión'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[var(--t-fg-dimmed)] text-sm mt-6">
                    ¿Nuevo en el club?{' '}
                    <Link to="/registro" className="text-[var(--t-accent)] hover:underline font-medium">
                        Únete gratis
                    </Link>
                </p>
            </div>
        </div>
    )
}
