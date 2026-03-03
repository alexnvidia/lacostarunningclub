import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Activity, ArrowLeft, CheckCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'

const schema = z.object({ email: z.string().email('Email inválido') })
type FormData = z.infer<typeof schema>

export default function RecuperarContrasena() {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

    const mutation = useMutation({
        mutationFn: (data: FormData) =>
            api.post('/api/auth/forgot-password', data).then(r => r.data),
    })

    if (mutation.isSuccess) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-3">Email enviado</h2>
                    <p className="text-gray-400 mb-8">Si el email está registrado, recibirás un enlace para restablecer tu contraseña.</p>
                    <Link to="/login" className="text-[#e63946] hover:underline">Volver al inicio de sesión</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <Link to="/" className="flex items-center justify-center gap-2 mb-10">
                    <Activity className="w-6 h-6 text-[#e63946]" />
                    <span className="font-bold text-white text-xl">LCRC<span className="text-[#e63946]">.</span></span>
                </Link>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8">
                    <Link to="/login" className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-2">Recuperar contraseña</h1>
                    <p className="text-gray-500 text-sm mb-8">Introduce tu email y te enviaremos un enlace de recuperación.</p>
                    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                            <input {...register('email')} type="email" placeholder="tu@email.com" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition-colors" />
                            {errors.email && <p className="text-[#e63946] text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <button type="submit" disabled={mutation.isPending} className="w-full bg-[#e63946] hover:bg-[#c1121f] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center">
                            {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar enlace'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
