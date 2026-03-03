import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Save, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/store/auth.store'

interface UserProfile { id: string; first_name: string; last_name?: string; email: string; phone?: string; role: string; email_verified: boolean; subscription?: { status: string; provider: string } }
const schema = z.object({ first_name: z.string().min(2), last_name: z.string().optional(), phone: z.string().optional() })
type FormData = z.infer<typeof schema>

export default function Perfil() {
    const [saved, setSaved] = useState(false)
    const qc = useQueryClient()
    const { updateUser } = useAuthStore()

    const { data: profile, isLoading } = useQuery({
        queryKey: queryKeys.user.profile(),
        queryFn: () => api.get<UserProfile>('/api/users/profile').then(r => r.data),
    })

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        values: { first_name: profile?.first_name ?? '', last_name: profile?.last_name ?? '', phone: profile?.phone ?? '' },
    })

    const mutation = useMutation({
        mutationFn: (data: FormData) => api.put('/api/users/profile', data).then(r => r.data),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: queryKeys.user.profile() })
            updateUser({ firstName: data.first_name, lastName: data.last_name })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        },
    })

    if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-12"><div className="bg-[#1a1a1a] rounded-2xl h-64 animate-pulse" /></div>

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <div className="mb-8">
                <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-2">Cuenta</p>
                <h1 className="text-3xl font-black text-white">Mi Perfil</h1>
            </div>

            {/* Profile card */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-[#e63946]/10 border border-[#e63946]/20 rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-[#e63946]" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-lg">{profile?.first_name} {profile?.last_name}</p>
                        <p className="text-gray-400 text-sm">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {profile?.email_verified ? (
                                <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Email verificado</span>
                            ) : (
                                <span className="text-xs text-yellow-400">Email pendiente de verificar</span>
                            )}
                            {profile?.subscription?.status === 'ACTIVE' && (
                                <span className="text-xs text-[#f4a261] bg-[#f4a261]/10 px-2 py-0.5 rounded-full">⭐ Suscriptor</span>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre</label>
                            <input {...register('first_name')} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white outline-none text-sm transition-colors" />
                            {errors.first_name && <p className="text-[#e63946] text-xs mt-1">{errors.first_name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Apellido</label>
                            <input {...register('last_name')} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white outline-none text-sm transition-colors" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Teléfono</label>
                        <input {...register('phone')} type="tel" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-4 py-2.5 text-white outline-none text-sm transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                        <input value={profile?.email} disabled className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-4 py-2.5 text-gray-500 text-sm cursor-not-allowed" />
                    </div>
                    <button type="submit" disabled={mutation.isPending} className="flex items-center gap-2 bg-[#e63946] hover:bg-[#c1121f] disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-all">
                        {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {saved ? '¡Guardado!' : 'Guardar cambios'}
                    </button>
                </form>
            </div>
        </div>
    )
}
