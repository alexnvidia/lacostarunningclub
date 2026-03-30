import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Save, CheckCircle, Lock, Gift, Award, Calendar } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/store/auth.store'
import { AnimationErrorBoundary } from '@/components/subscription/AnimationErrorBoundary'
import { LcrcPassScene } from '@/components/subscription/LcrcPassScene'
import { VerticalTimeline } from '@/components/subscription/VerticalTimeline'
import { RewardModal } from '@/components/subscription/RewardModal'

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
    3: { label: '3 meses', emoji: '🎽', gift: 'Camiseta exclusiva LCRC' },
    6: { label: '6 meses', emoji: '🧢', gift: 'Gorra de corredor LCRC' },
    9: { label: '9 meses', emoji: '🎒', gift: 'Mochila de trail running' },
    12: { label: '1 año', emoji: '🏅', gift: 'Medalla de oro aniversario' },
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
        cardClass = 'border-[var(--t-accent2)]/60 bg-[var(--t-accent2)]/5 ring-1 ring-[#f4a261]/30'
        iconEl = <Gift className="w-5 h-5 text-[var(--t-accent2)]" />
        stateLabel = (
            <button
                id={`claim-reward-${reward.milestone_months}`}
                onClick={() => onClaim(reward.milestone_months)}
                disabled={isClaiming}
                className="mt-2 text-xs font-semibold bg-[var(--t-accent2)] hover:bg-[#e08c4a] disabled:opacity-50 text-black px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
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
        cardClass = 'border-[var(--t-border)] bg-[var(--t-bg)] opacity-60'
        iconEl = <Lock className="w-5 h-5 text-[var(--t-fg-dimmed)]" />
        stateLabel = isNext ? (
            <span className="text-xs text-[var(--t-fg-dimmed)]">
                {remaining === 1 ? 'Falta 1 mes' : `Faltan ${remaining} meses`}
            </span>
        ) : (
            <span className="text-xs text-[var(--t-fg-dimmed)]">Bloqueado</span>
        )
    }

    return (
        <div className={`border rounded-xl p-4 flex flex-col gap-1.5 transition-all ${cardClass}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{meta.emoji}</span>
                    <div>
                        <p className="text-[var(--t-fg)] font-semibold text-sm">{meta.label}</p>
                        <p className="text-[var(--t-fg-muted)] text-xs">{meta.gift}</p>
                    </div>
                </div>
                {iconEl}
            </div>
            {stateLabel}
        </div>
    )
}

// ── Sub-component: Subscription Journey (Legacy fallback) ────────────────────

function SubscriptionJourneyLegacy({
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
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-accent)]/5 rounded-full blur-3xl pointer-events-none" />
                <div className="w-16 h-16 bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    <Lock className="w-6 h-6 text-[var(--t-accent)]" />
                </div>
                <h2 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">Contenido Exclusivo LCRC</h2>
                <p className="text-[var(--t-fg-muted)] mb-6 max-w-md mx-auto leading-relaxed relative z-10 text-sm">
                    La zona de Performance, los rankings y entrenamientos del club están reservados solo para los miembros con suscripción activa.
                </p>
                <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                    <a
                        href="https://buymeacoffee.com/lacostarunningclub/membership"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[#ffffff] font-bold py-3 px-6 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20 text-sm"
                    >
                        Suscribirme a LCRC Pass
                    </a>
                </div>
                <p className="mt-6 text-xs text-[var(--t-fg-dimmed)] relative z-10">
                    ¿Prefieres hacerlo en persona? Contacta con el staff de La Costa para formalizar tu inscripción y pago en nuestros eventos.
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
        <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-[var(--t-accent2)]" />
                    <h2 className="text-[var(--t-fg)] font-bold text-lg">Mi suscripción</h2>
                </div>
                <span className="text-xs bg-[var(--t-accent2)]/10 text-[var(--t-accent2)] border border-[var(--t-accent2)]/20 px-3 py-1 rounded-full font-medium">
                    ⭐ Activa
                </span>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mb-5">
                {activeSince && (
                    <div className="flex items-center gap-2 text-sm text-[var(--t-fg-muted)]">
                        <Calendar className="w-4 h-4 text-[var(--t-fg-dimmed)]" />
                        <span>Miembro desde <span className="text-[var(--t-fg)] font-medium">{activeSince}</span></span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[var(--t-fg-muted)]">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>
                        <span className="text-[var(--t-fg)] font-medium">{monthsActive}</span>
                        {' '}mes{monthsActive !== 1 ? 'es' : ''} activo{monthsActive !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-1 flex justify-between text-xs text-[var(--t-fg-dimmed)]">
                <span>Inicio</span>
                <span>1 año</span>
            </div>
            <div className="relative h-2 bg-[var(--t-bg)] rounded-full mb-1 overflow-hidden">
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
            <div className="flex justify-between text-xs text-[var(--t-fg-dimmed)] mb-6 px-px">
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

// ── Sub-component: Subscription Journey (Animated) ───────────────────────────

function SubscriptionJourney({
    subscription,
    rewards,
}: {
    subscription?: UserSubscription | null
    rewards?: UserReward[]
}) {
    const qc = useQueryClient()
    const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null)
    const [showRewardModal, setShowRewardModal] = useState(false)

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
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-accent)]/5 rounded-full blur-3xl pointer-events-none" />
                <div className="w-16 h-16 bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    <Lock className="w-6 h-6 text-[var(--t-accent)]" />
                </div>
                <h2 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">Contenido Exclusivo LCRC</h2>
                <p className="text-[var(--t-fg-muted)] mb-6 max-w-md mx-auto leading-relaxed relative z-10 text-sm">
                    La zona de Performance, los rankings y entrenamientos del club están reservados solo para los miembros con suscripción activa.
                </p>
                <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                    <a
                        href="https://buymeacoffee.com/lacostarunningclub/membership"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[#ffffff] font-bold py-3 px-6 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20 text-sm"
                    >
                        Suscribirme a LCRC Pass
                    </a>
                </div>
                <p className="mt-6 text-xs text-[var(--t-fg-dimmed)] relative z-10">
                    ¿Prefieres hacerlo en persona? Contacta con el staff de La Costa para formalizar tu inscripción y pago en nuestros eventos.
                </p>
            </div>
        )
    }

    const monthsActive = subscription.months_active ?? 0
    const progressRatio = Math.min(monthsActive / 12, 1)
    const isCompleted = monthsActive >= 12

    const filledRewards: UserReward[] = MILESTONES.map(m => {
        const found = rewards?.find(r => r.milestone_months === m)
        return found ?? { milestone_months: m, unlocked: monthsActive >= m, claimed: false, unlocked_at: null }
    })

    const activeSince = subscription.active_since
        ? new Date(subscription.active_since).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
        : null

    const legacyFallback = (
        <SubscriptionJourneyLegacy subscription={subscription} rewards={rewards} />
    )

    return (
        <AnimationErrorBoundary fallback={legacyFallback}>
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-[var(--t-accent2)]" />
                        <h2 className="text-[var(--t-fg)] font-bold text-lg">Mi suscripción</h2>
                    </div>
                    <span className="text-xs bg-[var(--t-accent2)]/10 text-[var(--t-accent2)] border border-[var(--t-accent2)]/20 px-3 py-1 rounded-full font-medium">
                        ⭐ Activa
                    </span>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 px-6 pb-4">
                    {activeSince && (
                        <div className="flex items-center gap-2 text-sm text-[var(--t-fg-muted)]">
                            <Calendar className="w-4 h-4 text-[var(--t-fg-dimmed)]" />
                            <span>Miembro desde <span className="text-[var(--t-fg)] font-medium">{activeSince}</span></span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-[var(--t-fg-muted)]">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>
                            <span className="text-[var(--t-fg)] font-medium">{monthsActive}</span>
                            {' '}mes{monthsActive !== 1 ? 'es' : ''} activo{monthsActive !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Animated Scene */}
                <LcrcPassScene
                    progressRatio={progressRatio}
                    isCompleted={isCompleted}
                    onCompleted={() => {
                        const yearReward = filledRewards.find(r => r.milestone_months === 12)
                        if (!yearReward?.claimed) {
                            setShowRewardModal(true)
                        }
                    }}
                />

                {/* Vertical Timeline */}
                <div className="px-6 pb-4">
                    <VerticalTimeline progressRatio={progressRatio} rewards={filledRewards} />
                </div>

                {/* Milestone Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 pb-6">
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

            {/* Reward Modal */}
            <RewardModal isOpen={showRewardModal} onClose={() => setShowRewardModal(false)} />
        </AnimationErrorBoundary>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Profile() {
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
                <div className="bg-[var(--t-bg2)] rounded-2xl h-64 animate-pulse" />
                <div className="bg-[var(--t-bg2)] rounded-2xl h-48 animate-pulse" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
            {/* Page title */}
            <div>
                <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-2">Cuenta</p>
                <h1 className="text-3xl font-black text-[var(--t-fg)]">Mi Perfil</h1>
            </div>

            {/* ── Profile card ── */}
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-[var(--t-accent)]" />
                    </div>
                    <div>
                        <p className="font-bold text-[var(--t-fg)] text-lg">{profile?.first_name} {profile?.last_name}</p>
                        <p className="text-[var(--t-fg-muted)] text-sm">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {profile?.email_verified ? (
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Email verificado
                                </span>
                            ) : (
                                <span className="text-xs text-yellow-400">Email pendiente de verificar</span>
                            )}
                            {profile?.subscription?.status === 'ACTIVE' && (
                                <span className="text-xs text-[var(--t-accent2)] bg-[var(--t-accent2)]/10 px-2 py-0.5 rounded-full">
                                    ⭐ Suscriptor
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Nombre</label>
                            <input
                                {...register('first_name')}
                                id="first_name"
                                autoComplete="given-name"
                                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] outline-none text-sm transition-colors"
                            />
                            {errors.first_name && <p className="text-[var(--t-accent)] text-xs mt-1">{errors.first_name.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Apellido</label>
                            <input
                                {...register('last_name')}
                                id="last_name"
                                autoComplete="family-name"
                                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] outline-none text-sm transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Teléfono</label>
                        <input
                            {...register('phone')}
                            id="phone"
                            type="tel"
                            autoComplete="tel"
                            className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-4 py-2.5 text-[var(--t-fg)] outline-none text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label htmlFor="email_display" className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">Email</label>
                        <input
                            id="email_display"
                            value={profile?.email}
                            disabled
                            autoComplete="off"
                            className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-lg px-4 py-2.5 text-[var(--t-fg-dimmed)] text-sm cursor-not-allowed"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-50 text-[var(--t-fg)] font-semibold px-6 py-2.5 rounded-lg transition-all"
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
