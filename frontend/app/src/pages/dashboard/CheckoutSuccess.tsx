import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, AlertTriangle, Loader2, Home, ArrowRight } from 'lucide-react'
import api from '@/lib/api'

// ── Types ───────────────────────────────────────────────────────────────────

interface CheckoutSessionResponse {
    id: string
    status: string
    payment_status: string
    customer_email: string | null
    amount_total: number | null
    currency: string | null
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CheckoutSuccess() {
    const [searchParams] = useSearchParams()
    const sessionId = searchParams.get('session_id')

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['stripe', 'checkout-session', sessionId],
        queryFn: () =>
            api.get<CheckoutSessionResponse>(`/api/admin/stripe/checkout-session/${sessionId}`).then(r => r.data),
        enabled: !!sessionId,
        retry: 2,
        staleTime: 0,
    })

    const isSuccess = data?.status === 'complete' && data?.payment_status === 'paid'
    const isPending = data && !isSuccess

    return (
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-accent)]/5 rounded-full blur-3xl pointer-events-none" />

                {/* No session ID */}
                {!sessionId && (
                    <>
                        <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                            <AlertTriangle className="w-7 h-7 text-yellow-400" />
                        </div>
                        <h1 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">Missing session</h1>
                        <p className="text-[var(--t-fg-muted)] mb-8 text-sm relative z-10">
                            No session ID was provided. Please try subscribing again.
                        </p>
                        <Link
                            to="/performance"
                            className="inline-flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white font-bold py-3 px-8 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20 relative z-10"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Go to Performance
                        </Link>
                    </>
                )}

                {/* Loading */}
                {sessionId && isLoading && (
                    <>
                        <div className="w-16 h-16 bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                            <Loader2 className="w-7 h-7 text-[var(--t-accent)] animate-spin" />
                        </div>
                        <h1 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">Verificando tu pago...</h1>
                        <p className="text-[var(--t-fg-muted)] text-sm relative z-10">
                            Estamos confirmando el estado de tu suscripción.
                        </p>
                    </>
                )}

                {/* Error fetching session */}
                {sessionId && isError && !isLoading && (
                    <>
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                            <AlertTriangle className="w-7 h-7 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">We couldn't verify your subscription status.</h1>
                        <p className="text-[var(--t-fg-muted)] mb-8 text-sm relative z-10">
                            {error && typeof error === 'object' && 'message' in error
                                ? (error as Error).message
                                : 'Please try again or contact support.'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
                            <Link
                                to="/performance"
                                className="inline-flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white font-bold py-3 px-8 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20"
                            >
                                <ArrowRight className="w-4 h-4" />
                                Go to Performance
                            </Link>
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-[var(--t-accent)] text-[var(--t-fg)] font-semibold py-3 px-8 rounded-xl transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Go home
                            </Link>
                        </div>
                    </>
                )}

                {/* Success */}
                {sessionId && !isLoading && !isError && isSuccess && (
                    <>
                        <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                            <CheckCircle className="w-7 h-7 text-green-400" />
                        </div>
                        <h1 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">Subscription completed</h1>
                        <p className="text-[var(--t-fg-muted)] mb-8 text-sm relative z-10">
                            Welcome to LCRC Pass. Your exclusive member benefits are now active.
                        </p>
                        <Link
                            to="/performance"
                            className="inline-flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white font-bold py-3 px-8 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20 relative z-10"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Go to Performance
                        </Link>
                    </>
                )}

                {/* Pending */}
                {sessionId && !isLoading && !isError && isPending && (
                    <>
                        <div className="w-16 h-16 bg-[var(--t-accent2)]/10 border border-[var(--t-accent2)]/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                            <Clock className="w-7 h-7 text-[var(--t-accent2)]" />
                        </div>
                        <h1 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">Payment received. We're finishing your activation.</h1>
                        <p className="text-[var(--t-fg-muted)] mb-8 text-sm relative z-10">
                            This usually takes just a moment. Refresh the page shortly to access your exclusive content.
                        </p>
                        <Link
                            to="/performance"
                            className="inline-flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white font-bold py-3 px-8 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20 relative z-10"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Go to Performance
                        </Link>
                    </>
                )}

                {/* Bottom note — always visible when we have a session */}
                {sessionId && !isLoading && !isError && (
                    <p className="mt-8 text-xs text-[var(--t-fg-dimmed)] relative z-10">
                        Your subscription will be activated by our system. If you don't see changes within a few minutes, please contact support.
                    </p>
                )}
            </div>
        </div>
    )
}
