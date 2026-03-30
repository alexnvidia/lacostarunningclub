import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Activity, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const registerSchema = z.object({
    first_name: z.string().min(2, 'Mínimo 2 caracteres'),
    last_name: z.string().optional(),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    phone: z.string().optional(),
})
type RegisterForm = z.infer<typeof registerSchema>

export default function Registro() {
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuthStore()

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    })

    const registerMutation = useMutation({
        mutationFn: (data: RegisterForm) =>
            api.post('/api/auth/register', data).then(r => r.data),
        onSuccess: (data) => {
            login(data.token, data.refresh_token, {
                id: data.user.id,
                email: data.user.email,
                firstName: data.user.first_name,
                lastName: data.user.last_name,
                role: data.user.role,
            })
            navigate('/dashboard')
        },
    })

    const errorCode = (registerMutation.error as { response?: { data?: { code?: string } } })?.response?.data?.code
    const errorMsg = errorCode === 'EMAIL_EXISTS' ? 'Este email ya está registrado.' : registerMutation.error ? 'Error al registrarse. Inténtalo de nuevo.' : null

    return (
        <div className="min-h-screen bg-[var(--t-bg)] flex items-center justify-center px-4 py-12">
            <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--t-accent)]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md">
                <Link to="/" className="flex items-center justify-center gap-2 mb-10">
                    <Activity className="w-6 h-6 text-[var(--t-accent)]" />
                    <span className="font-bold text-[var(--t-fg)] text-xl">LCRC<span className="text-[var(--t-accent)]">.</span></span>
                </Link>

                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-8">
                    <h1 className="text-2xl font-bold text-[var(--t-fg)] mb-1">Únete al club</h1>
                    <p className="text-[var(--t-fg-dimmed)] text-sm mb-8">Crea tu cuenta gratuita de La Costa Running Club</p>

                    <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Nombre *</label>
                                <input {...register('first_name')} id="first_name" autoComplete="given-name" placeholder="Juan" className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-3 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors" />
                                {errors.first_name && <p className="text-[var(--t-accent)] text-xs mt-1">{errors.first_name.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Apellido</label>
                                <input {...register('last_name')} id="last_name" autoComplete="family-name" placeholder="García" className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-3 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Email *</label>
                            <input {...register('email')} id="email" type="email" autoComplete="email" placeholder="tu@email.com" className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-4 py-3 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors" />
                            {errors.email && <p className="text-[var(--t-accent)] text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Contraseña *</label>
                            <div className="relative">
                                <input {...register('password')} id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-4 py-3 pr-10 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t-fg-dimmed)]">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-[var(--t-accent)] text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Teléfono</label>
                            <input {...register('phone')} id="phone" type="tel" autoComplete="tel" placeholder="+34 600 000 000" className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-4 py-3 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors" />
                        </div>

                        {errorMsg && (
                            <div className="bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-lg px-4 py-3">
                                <p className="text-[var(--t-accent)] text-sm">{errorMsg}</p>
                            </div>
                        )}

                        <button type="submit" disabled={registerMutation.isPending} className="w-full bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-50 text-[var(--t-fg)] font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2">
                            {registerMutation.isPending
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : 'Crear cuenta'}
                        </button>

                        <p className="text-center text-[var(--t-fg-dimmed)] text-xs pt-2">
                            Al registrarte aceptas nuestros términos de uso
                        </p>
                    </form>
                </div>

                <p className="text-center text-[var(--t-fg-dimmed)] text-sm mt-6">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-[var(--t-accent)] hover:underline font-medium">Inicia sesión</Link>
                </p>
            </div>
        </div>
    )
}
