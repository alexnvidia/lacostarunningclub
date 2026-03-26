import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { ArrowLeft, Star, PlusCircle, Trophy, Lock, Gift, CheckCircle2 } from 'lucide-react'
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

interface UserReward {
    milestone_months: number
    unlocked: boolean
    claimed: boolean
    unlocked_at: string | null
}

interface UserRewardsResponse {
    user_id: string
    months_active: number
    rewards: UserReward[]
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
    EXPIRED: 'bg-gray-500/10 text-[var(--t-fg-muted)]',
    PENDING: 'bg-yellow-500/10 text-yellow-400',
}

// ── Rewards badge + expandable panel ────────────────────────────────────────
function RewardsBadge({ userId }: { userId: string }) {
    const [open, setOpen] = useState(false)

    const { data, isLoading } = useQuery<UserRewardsResponse>({
        queryKey: queryKeys.admin.userRewards(userId),
        queryFn: () => api.get(`/api/users/${userId}/rewards`).then(r => r.data),
        staleTime: 5 * 60 * 1000,
    })

    if (isLoading) {
        return <div className="w-5 h-5 rounded-full bg-[#2a2a2a] animate-pulse" />
    }

    if (!data) return null

    const hasClaimed = data.rewards.some(r => r.claimed)
    const hasPending = !hasClaimed && data.rewards.some(r => r.unlocked && !r.claimed)

    // Hide trophy if no rewards are available at all
    if (!hasClaimed && !hasPending) return null

    const iconColor = hasClaimed
        ? 'text-yellow-400 hover:text-yellow-300'
        : 'text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg-muted)]'

    const tooltipText = hasClaimed
        ? 'Tiene rewards reclamados'
        : 'Tiene rewards pendientes de reclamar'

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                title={tooltipText}
                className={`transition-colors ${iconColor}`}
            >
                <Trophy className="w-4 h-4" />
            </button>

            {open && (
                <div className="absolute right-0 top-7 z-50 w-72 bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl shadow-2xl p-4">
                    <p className="text-xs text-[var(--t-fg-dimmed)] mb-3 font-mono truncate">{userId}</p>
                    <p className="text-xs text-[var(--t-fg-muted)] mb-3">
                        <span className="text-[var(--t-fg)] font-semibold">{data.months_active}</span> meses activo
                    </p>
                    <div className="space-y-2">
                        {data.rewards.map(r => {
                            const label = `${r.milestone_months} meses`
                            if (r.claimed) {
                                return (
                                    <div key={r.milestone_months} className="flex items-center justify-between">
                                        <span className="text-xs text-[var(--t-fg)] flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400" /> {label}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">
                                            Reclamado
                                        </span>
                                    </div>
                                )
                            }
                            if (r.unlocked) {
                                return (
                                    <div key={r.milestone_months} className="flex items-center justify-between">
                                        <span className="text-xs text-[var(--t-fg)] flex items-center gap-1.5">
                                            <Gift className="w-3.5 h-3.5 text-blue-400" /> {label}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                                            Pendiente
                                        </span>
                                    </div>
                                )
                            }
                            return (
                                <div key={r.milestone_months} className="flex items-center justify-between opacity-40">
                                    <span className="text-xs text-[var(--t-fg-dimmed)] flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5" /> {label}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/10 text-[var(--t-fg-dimmed)] font-medium">
                                        Bloqueado
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="mt-3 text-[10px] text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg-muted)] transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────
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
            <Link to="/admin" className="flex items-center gap-1 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Panel Admin
            </Link>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-1">Admin</p>
                    <h1 className="text-3xl font-black text-[var(--t-fg)] flex items-center gap-2">
                        <Star className="w-7 h-7" /> Suscripciones
                    </h1>
                </div>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[var(--t-fg)] font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    <PlusCircle className="w-4 h-4" /> Nueva suscripción
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="bg-[var(--t-bg2)] border border-[var(--t-accent)]/30 rounded-2xl p-6 mb-6">
                    <h2 className="text-[var(--t-fg)] font-bold mb-4">Crear / actualizar suscripción</h2>
                    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="sub-user-id" className="block text-sm text-[var(--t-fg-muted)] mb-1.5">User ID *</label>
                            <input
                                {...register('user_id', { required: 'Campo requerido' })}
                                id="sub-user-id"
                                autoComplete="off"
                                placeholder="UUID del usuario"
                                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors"
                            />
                            {errors.user_id && <p className="text-[var(--t-accent)] text-xs mt-1">{errors.user_id.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="sub-status" className="block text-sm text-[var(--t-fg-muted)] mb-1.5">Estado</label>
                            <select {...register('status')} id="sub-status"
                                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] outline-none text-sm transition-colors">
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="CANCELLED">CANCELLED</option>
                                <option value="EXPIRED">EXPIRED</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="sub-start-date" className="block text-sm text-[var(--t-fg-muted)] mb-1.5">Fecha inicio</label>
                            <input
                                {...register('start_date')}
                                id="sub-start-date"
                                type="date"
                                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] outline-none text-sm transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="sub-external-id" className="block text-sm text-[var(--t-fg-muted)] mb-1.5">
                                External ID <span className="text-[var(--t-fg-dimmed)] font-normal">(BMC · opcional)</span>
                            </label>
                            <input
                                {...register('external_id')}
                                id="sub-external-id"
                                autoComplete="off"
                                placeholder="ID de Buy Me a Coffee"
                                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors font-mono"
                            />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
                            <button type="submit" disabled={mutation.isPending}
                                className="bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-40 text-[var(--t-fg)] font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2">
                                {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                Guardar
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm transition-colors">
                                Cancelar
                            </button>
                        </div>
                        {mutation.isError && <p className="sm:col-span-2 lg:col-span-4 text-[var(--t-accent)] text-sm">Error al guardar la suscripción.</p>}
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl">
                {/* Header row — added Rewards column */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-6 py-3 border-b border-[var(--t-border)] text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider">
                    <span>User ID</span><span>Estado</span><span>Inicio</span><span>Proveedor</span><span>Ext. ID</span>
                    <span title="Rewards"><Trophy className="w-3.5 h-3.5" /></span>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-[#2a2a2a] rounded animate-pulse" />)}
                    </div>
                ) : (data?.subscriptions ?? []).length === 0 ? (
                    <p className="text-center py-16 text-[var(--t-fg-dimmed)]">No hay suscripciones</p>
                ) : (
                    <div className="divide-y divide-[var(--t-border)]">
                        {data!.subscriptions.map(sub => (
                            <div key={sub.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 items-center px-6 py-4">
                                <p className="text-[var(--t-fg-muted)] text-xs truncate font-mono">{sub.user_id}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[sub.status] ?? 'bg-gray-500/10 text-[var(--t-fg-muted)]'}`}>
                                    {sub.status}
                                </span>
                                <p className="text-[var(--t-fg-muted)] text-xs">{formatDateTime(sub.start_date)}</p>
                                <p className="text-[var(--t-fg-muted)] text-xs capitalize">{sub.provider}</p>
                                <p className="text-[var(--t-fg-dimmed)] text-xs font-mono truncate">{sub.external_id ?? '—'}</p>
                                {/* Rewards badge */}
                                <RewardsBadge userId={sub.user_id} />
                            </div>
                        ))}
                    </div>
                )}

                {data && data.pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--t-border)]">
                        <p className="text-xs text-[var(--t-fg-dimmed)]">{data.pagination.total} suscripciones</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-[var(--t-fg-muted)] rounded-lg text-xs disabled:opacity-40">Anterior</button>
                            <span className="px-3 py-1.5 text-xs text-[var(--t-fg-muted)]">{page} / {data.pagination.total_pages}</span>
                            <button onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))} disabled={page === data.pagination.total_pages}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-[var(--t-fg-muted)] rounded-lg text-xs disabled:opacity-40">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
