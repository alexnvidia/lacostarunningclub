import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Save, CheckCircle, Lock, Gift, Award, Calendar } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/store/auth.store'

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserReward {
    milestone_months: number
    unlocked: boolean
    claimed: boolean
    unlocked_at: string | null
}

interface UserSubscription {
    status: string
    provider?: string
    active_since: string | null
    months_active: number
}

interface UserProfile {
    id: string
    first_name: string
    last_name?: string
    email: string
    phone?: string
    role: string
    email_verified: boolean
    subscription?: UserSubscription | null
    rewards?: UserReward[]
}

// ── Form schema ────────────────────────────────────────────────────────────────

const schema = z.object({
    first_name: z.string().min(2),
    last_name: z.string().optional(),
    phone: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Milestone config ───────────────────────────────────────────────────────────

const MILESTONES = [3, 6, 9, 12]

const MILESTONE_META: Record<number, { label: string; emoji: string; gift: string }> = {
    3:  { label: '3 meses',  emoji: '🎽', gift: 'Camiseta exclusiva LCRC' },
    6:  { label: '6 meses',  emoji: '🧢', gift: 'Gorra de corredor LCRC'  },
    9:  { label: '9 meses',  emoji: '🎒', gift: 'Mochila de trail running' },
    12: { label: '1 año',    emoji: '🏅', gift: 'Medalla de oro aniversario' },
}

// ── Sub-component: Milestone card ─────────────────────────────────────────────

function MilestoneCard({
    reward,
    monthsActive,
    onClaim,
    isClaiming,
}: {
    reward: UserReward
    monthsActive: number
    onClaim: (milestone: number) => void
    isClaiming: boolean
}) {
    const meta = MILESTONE_META[reward.milestone_months]
    const isNext = !reward.unlocked && monthsActive < reward.milestone_months
    const remaining = reward.milestone_months - monthsActive

    let stateLabel: React.ReactNode
    let cardClass: string
    let iconEl: React.ReactNode

    if (reward.claimed) {
        cardClass = 'border-green-500/40 bg-green-500/5'
        iconEl = <CheckCircle className="w-5 h-5 text-green-400" />
        stateLabel = <span className="text-xs text-green-400 font-medium">Reclamado ✓</span>
    } else if (reward.unlocked) {
        cardClass = 'border-[#f4a261]/60 bg-[#f4a261]/5 ring-1 ring-[#f4a261]/30'
        iconEl = <Gift className="w-5 h-5 text-[#f4a261]" />
        stateLabel = (
            <button
                id={`claim-reward-${reward.milestone_months}`}
                onClick={() => onClaim(reward.milestone_months)}
                disabled={isClaiming}
                className="mt-2 text-xs font-semibold bg-[#f4a261] hover:bg-[#e08c4a] disabled:opacity-50 text-black px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
                {isClaiming ? (
                    <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                    <Gift className="w-3 h-3" />
                )}
                Reclamar regalo
            </button>
        )
    } else {
        cardClass = 'border-[#2a2a2a] bg-[#111] opacity-60'
        iconEl = <Lock className="w-5 h-5 text-gray-600" />
        stateLabel = isNext ? (
            <span className="text-xs text-gray-500">
                {remaining === 1 ? 'Falta 1 mes' : `Faltan ${remaining} meses`}
            </span>
        ) : (
            <span className="text-xs text-gray-600">Bloqueado</span>
        )
    }

    return (
        <div className={`border rounded-xl p-4 flex flex-col gap-1.5 transition-all ${cardClass}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{meta.emoji}</span>
                    <div>
                        <p className="text-white font-semibold text-sm">{meta.label}</p>
                        <p className="text-gray-400 text-xs">{meta.gift}</p>
                    </div>
                </div>
                {iconEl}
            </div>
            {stateLabel}
        </div>
    )
}

// ── Sub-component: Subscription Journey ───────────────────────────────────────

function SubscriptionJourney({
    subscription,
    rewards,
}: {
    subscription?: UserSubscription | null
    rewards?: UserReward[]
}) {
    const qc = useQueryClient()
    const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null)

    const claimMutation = useMutation({
        mutationFn: (milestone: number) =>
            api.post(`/api/users/rewards/${milestone}/claim`).then(r => r.data),
        onMutate: (milestone) => setClaimingMilestone(milestone),
        onSettled: () => {
            setClaimingMilestone(null)
            qc.invalidateQueries({ queryKey: queryKeys.user.profile() })
        },
    })

    // No subscription → empty state
    if (!subscription || subscription.status !== 'ACTIVE') {
        return (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Award className="w-5 h-5 text-gray-600" />
                    <h2 className="text-white font-bold text-lg">Mi suscripción</h2>
                </div>
                <p className="text-gray-500 text-sm">
                    Aún no tienes una suscripción activa. ¡Únete al club para desbloquear regalos exclusivos!
                </p>
            </div>
        )
    }

    const monthsActive = subscription.months_active ?? 0
    const filledRewards: UserReward[] = MILESTONES.map(m => {
        const found = rewards?.find(r => r.milestone_months === m)
        return found ?? { milestone_months: m, unlocked: monthsActive >= m, claimed: false, unlocked_at: null }
    })

    // Progress bar: 0–12 months mapped to 0–100%
    const progressPct = Math.min((monthsActive / 12) * 100, 100)

    const activeSince = subscription.active_since
        ? new Date(subscription.active_since).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
        : null

    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-[#f4a261]" />
                    <h2 className="text-white font-bold text-lg">Mi suscripción</h2>
                </div>
                <span className="text-xs bg-[#f4a261]/10 text-[#f4a261] border border-[#f4a261]/20 px-3 py-1 rounded-full font-medium">
                    ⭐ Activa
                </span>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mb-5">
                {activeSince && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>Miembro desde <span className="text-white font-medium">{activeSince}</span></span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>
                        <span className="text-white font-medium">{monthsActive}</span>
                        {' '}mes{monthsActive !== 1 ? 'es' : ''} activo{monthsActive !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Inicio</span>
                <span>1 año</span>
            </div>
            <div className="relative h-2 bg-[#0d0d0d] rounded-full mb-1 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-[#e63946] to-[#f4a261] rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                />
                {/* Milestone ticks */}
                {MILESTONES.map(m => (
                    <div
                        key={m}
                        className="absolute top-0 bottom-0 w-px bg-[#2a2a2a]"
                        style={{ left: `${(m / 12) * 100}%` }}
                    />
                ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mb-6 px-px">
                {MILESTONES.map(m => (
                    <span key={m} style={{ width: '25%', textAlign: 'center' }}>
                        {m}m
                    </span>
                ))}
            </div>

            {/* Milestone cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filledRewards.map(reward => (
                    <MilestoneCard
                        key={reward.milestone_months}
                        reward={reward}
                        monthsActive={monthsActive}
                        onClaim={(m) => claimMutation.mutate(m)}
                        isClaiming={claimingMilestone === reward.milestone_months && claimMutation.isPending}
                    />
                ))}
            </div>
        </div>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

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
        values: {
            first_name: profile?.first_name ?? '',
            last_name: profile?.last_name ?? '',
            phone: profile?.phone ?? '',
        },
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

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
                <div className="bg-[#1a1a1a] rounded-2xl h-64 animate-pulse" />
                <div className="bg-[#1a1a1a] rounded-2xl h-48 animate-pulse" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
            {/* Page title */}
            <div>
                <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-2">Cuenta</p>
                <h1 className="text-3xl font-black text-white">Mi Perfil</h1>
            </div>

            {/* ── Profile card ── */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-[#e63946]/10 border border-[#e63946]/20 rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-[#e63946]" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-lg">{profile?.first_name} {profile?.last_name}</p>
                        <p className="text-gray-400 text-sm">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {profile?.email_verified ? (
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Email verificado
                                </span>
                            ) : (
                                <span className="text-xs text-yellow-400">Email pendiente de verificar</span>
                            )}
                            {profile?.subscription?.status === 'ACTIVE' && (
                                <span className="text-xs text-[#f4a261] bg-[#f4a261]/10 px-2 py-0.5 rounded-full">
                                    ⭐ Suscriptor
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1.5">Nombre</label>
                            <input
                                {...register('first_name')}
                                id="first_name"
                                autoComplete="given-name"
                                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white outline-none text-sm transition-colors"
                            />
                            {errors.first_name && <p className="text-[#e63946] text-xs mt-1">{errors.first_name.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-1.5">Apellido</label>
                            <input
                                {...register('last_name')}
                                id="last_name"
                                autoComplete="family-name"
                                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2.5 text-white outline-none text-sm transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">Teléfono</label>
                        <input
                            {...register('phone')}
                            id="phone"
                            type="tel"
                            autoComplete="tel"
                            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-4 py-2.5 text-white outline-none text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label htmlFor="email_display" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                        <input
                            id="email_display"
                            value={profile?.email}
                            disabled
                            autoComplete="off"
                            className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-4 py-2.5 text-gray-500 text-sm cursor-not-allowed"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="flex items-center gap-2 bg-[#e63946] hover:bg-[#c1121f] disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-all"
                    >
                        {mutation.isPending
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Save className="w-4 h-4" />
                        }
                        {saved ? '¡Guardado!' : 'Guardar cambios'}
                    </button>
                </form>
            </div>

            {/* ── Subscription Journey ── */}
            <SubscriptionJourney
                subscription={profile?.subscription}
                rewards={profile?.rewards}
            />
        </div>
    )
}
