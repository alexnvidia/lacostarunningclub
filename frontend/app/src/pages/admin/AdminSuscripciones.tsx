import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { ArrowLeft, Star, PlusCircle } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'

interface Subscription {
    id: string
    user_id: string
    status: string
    start_date: string
    end_date?: string
    last_payment_date?: string
    provider: string
    external_id?: string
}

interface SubsResponse {
    subscriptions: Subscription[]
    pagination: { page: number; limit: number; total: number; total_pages: number }
}

interface SubForm {
    user_id: string
    status: string
    start_date: string
    external_id?: string
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
    EXPIRED: 'bg-gray-500/10 text-gray-400',
    PENDING: 'bg-yellow-500/10 text-yellow-400',
}

export default function AdminSuscripciones() {
    const [page, setPage] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const qc = useQueryClient()

    const { data, isLoading } = useQuery<SubsResponse>({
        queryKey: queryKeys.admin.subscriptions(page),
        queryFn: () => api.get(`/api/admin/subscriptions?page=${page}&limit=20`).then(r => r.data),
    })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<SubForm>({
        defaultValues: { status: 'ACTIVE', start_date: new Date().toISOString().split('T')[0] }
    })

    const mutation = useMutation({
        mutationFn: (form: SubForm) =>
            api.post(`/api/admin/subscriptions?user_id=${form.user_id}`, {
                status: form.status,
                start_date: form.start_date,
                // Solo enviamos external_id si el usuario ha rellenado el campo
                ...(form.external_id?.trim() && { external_id: form.external_id.trim() }),
            }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
            reset()
            setShowForm(false)
        },
    })

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
            <Link to="/admin" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Panel Admin
            </Link>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-1">Admin</p>
                    <h1 className="text-3xl font-black text-white flex items-center gap-2">
                        <Star className="w-7 h-7" /> Suscripciones
                    </h1>
                </div>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 bg-[#e63946] hover:bg-[#c1121f] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    <PlusCircle className="w-4 h-4" /> Nueva suscripción
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="bg-[#1a1a1a] border border-[#e63946]/30 rounded-2xl p-6 mb-6">
                    <h2 className="text-white font-bold mb-4">Crear / actualizar suscripción</h2>
                    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="sub-user-id" className="block text-sm text-gray-400 mb-1.5">User ID *</label>
                            <input
                                {...register('user_id', { required: 'Campo requerido' })}
                                id="sub-user-id"
                                autoComplete="off"
                                placeholder="UUID del usuario"
                                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 outline-none text-sm transition-colors"
                            />
                            {errors.user_id && <p className="text-[#e63946] text-xs mt-1">{errors.user_id.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="sub-status" className="block text-sm text-gray-400 mb-1.5">Estado</label>
                            <select {...register('status')} id="sub-status"
                                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white outline-none text-sm transition-colors">
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="CANCELLED">CANCELLED</option>
                                <option value="EXPIRED">EXPIRED</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="sub-start-date" className="block text-sm text-gray-400 mb-1.5">Fecha inicio</label>
                            <input
                                {...register('start_date')}
                                id="sub-start-date"
                                type="date"
                                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white outline-none text-sm transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="sub-external-id" className="block text-sm text-gray-400 mb-1.5">
                                External ID <span className="text-gray-600 font-normal">(BMC · opcional)</span>
                            </label>
                            <input
                                {...register('external_id')}
                                id="sub-external-id"
                                autoComplete="off"
                                placeholder="ID de Buy Me a Coffee"
                                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 outline-none text-sm transition-colors font-mono"
                            />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
                            <button type="submit" disabled={mutation.isPending}
                                className="bg-[#e63946] hover:bg-[#c1121f] disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2">
                                {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                Guardar
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-400 hover:text-white text-sm transition-colors">
                                Cancelar
                            </button>
                        </div>
                        {mutation.isError && <p className="sm:col-span-2 lg:col-span-4 text-[#e63946] text-sm">Error al guardar la suscripción.</p>}
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#2a2a2a] text-xs text-gray-500 uppercase tracking-wider">
                    <span>User ID</span><span>Estado</span><span>Inicio</span><span>Proveedor</span><span>Ext. ID</span>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-[#2a2a2a] rounded animate-pulse" />)}
                    </div>
                ) : (data?.subscriptions ?? []).length === 0 ? (
                    <p className="text-center py-16 text-gray-500">No hay suscripciones</p>
                ) : (
                    <div className="divide-y divide-[#2a2a2a]">
                        {data!.subscriptions.map(sub => (
                            <div key={sub.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4">
                                <p className="text-gray-400 text-xs truncate font-mono">{sub.user_id}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[sub.status] ?? 'bg-gray-500/10 text-gray-400'}`}>
                                    {sub.status}
                                </span>
                                <p className="text-gray-400 text-xs">{formatDateTime(sub.start_date)}</p>
                                <p className="text-gray-400 text-xs capitalize">{sub.provider}</p>
                                <p className="text-gray-600 text-xs font-mono truncate">{sub.external_id ?? '—'}</p>
                            </div>
                        ))}
                    </div>
                )}

                {data && data.pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2a2a]">
                        <p className="text-xs text-gray-500">{data.pagination.total} suscripciones</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-gray-400 rounded-lg text-xs disabled:opacity-40">Anterior</button>
                            <span className="px-3 py-1.5 text-xs text-gray-400">{page} / {data.pagination.total_pages}</span>
                            <button onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))} disabled={page === data.pagination.total_pages}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-gray-400 rounded-lg text-xs disabled:opacity-40">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
