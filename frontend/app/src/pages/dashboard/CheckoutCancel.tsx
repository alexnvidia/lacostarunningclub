import { Link } from 'react-router-dom'
import { XCircle, Home, ArrowRight } from 'lucide-react'

export default function CheckoutCancel() {
    return (
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-accent)]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    <XCircle className="w-7 h-7 text-red-400" />
                </div>

                <h1 className="text-2xl font-black text-[var(--t-fg)] mb-3 relative z-10">
                    Payment cancelled
                </h1>

                <p className="text-[var(--t-fg-muted)] mb-8 text-sm relative z-10">
                    Your subscription process was cancelled. No charges were made.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
                    <Link
                        to="/performance"
                        className="inline-flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white font-bold py-3 px-8 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20"
                    >
                        <ArrowRight className="w-4 h-4" />
                        Try again
                    </Link>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-[var(--t-accent)] text-[var(--t-fg)] font-semibold py-3 px-8 rounded-xl transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    )
}
