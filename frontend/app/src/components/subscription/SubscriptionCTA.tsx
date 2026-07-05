import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'

// ── Types ───────────────────────────────────────────────────────────────────

export interface SubscriptionCTAProps {
    className?: string
}

type BillingCycle = 'monthly' | 'yearly'

// ── Constants ───────────────────────────────────────────────────────────────

const PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY as string | undefined
const PRICE_YEARLY = import.meta.env.VITE_STRIPE_PRICE_YEARLY as string | undefined

interface CheckoutSessionResponse {
    sessionId: string
    url: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// (reserved for future formatting needs, e.g. displaying prices from Stripe metadata)
// function formatPrice(amount: number, currency: string) { ... }

// ── Component ───────────────────────────────────────────────────────────────

export default function SubscriptionCTA({ className }: SubscriptionCTAProps) {
    const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly')

    const checkoutMutation = useMutation<string, Error, string>({
        mutationFn: async (priceId: string) => {
            const res = await api.post<CheckoutSessionResponse>(
                '/api/admin/stripe/checkout-session',
                { priceId }
            )
            return res.data.url
        },
        onSuccess: (url) => {
            window.location.href = url
        },
    })

    const selectedPriceId = selectedCycle === 'monthly' ? PRICE_MONTHLY : PRICE_YEARLY
    const isMissingEnv = !PRICE_MONTHLY || !PRICE_YEARLY

    return (
        <div className={className}>
            {/* Plan selection cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {/* Monthly */}
                <button
                    type="button"
                    onClick={() => setSelectedCycle('monthly')}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        selectedCycle === 'monthly'
                            ? 'border-[var(--t-accent)] bg-[var(--t-accent)]/10'
                            : 'border-[var(--t-border)] bg-[var(--t-bg)] hover:border-[var(--t-accent)]/40'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[var(--t-fg)]">LCRC Pass Monthly</span>
                        {selectedCycle === 'monthly' && (
                            <span className="w-2 h-2 rounded-full bg-[var(--t-accent)]" />
                        )}
                    </div>
                </button>

                {/* Yearly */}
                <button
                    type="button"
                    onClick={() => setSelectedCycle('yearly')}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        selectedCycle === 'yearly'
                            ? 'border-[var(--t-accent)] bg-[var(--t-accent)]/10'
                            : 'border-[var(--t-border)] bg-[var(--t-bg)] hover:border-[var(--t-accent)]/40'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[var(--t-fg)]">LCRC Pass Yearly</span>
                        {selectedCycle === 'yearly' && (
                            <span className="w-2 h-2 rounded-full bg-[var(--t-accent)]" />
                        )}
                    </div>
                </button>
            </div>

            {/* CTA Button */}
            <button
                type="button"
                disabled={checkoutMutation.isPending || isMissingEnv}
                onClick={() => {
                    if (!selectedPriceId) return
                    checkoutMutation.mutate(selectedPriceId)
                }}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 font-bold py-3.5 px-8 rounded-xl transition-all hover:-translate-y-1 shadow-lg ${
                    isMissingEnv
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : 'bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white shadow-[var(--t-accent)]/20'
                }`}
            >
                {checkoutMutation.isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirigiendo...
                    </>
                ) : (
                    <>Suscribirme a LCRC Pass</>
                )}
            </button>

            {/* Error / Missing env message */}
            {isMissingEnv && (
                <p className="mt-3 text-xs text-yellow-400">
                    Stripe price IDs are not configured. Please set VITE_STRIPE_PRICE_MONTHLY and VITE_STRIPE_PRICE_YEARLY.
                </p>
            )}
            {checkoutMutation.isError && (
                <p className="mt-3 text-xs text-red-400">
                    {checkoutMutation.error?.message || 'No se pudo iniciar el pago. Inténtalo de nuevo.'}
                </p>
            )}
        </div>
    )
}
