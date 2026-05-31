import { createPortal } from 'react-dom'

interface Props {
    isOpen: boolean
    onClose: () => void
}

export function RewardModal({ isOpen, onClose }: Props) {
    if (!isOpen) return null

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-[var(--t-bg2)] border border-[var(--t-accent2)]/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-[scaleIn_0.35s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glow ring */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#f4a261]/20 to-transparent pointer-events-none" />

                <div className="text-6xl mb-4 select-none">🏆</div>
                <h2 className="text-[var(--t-fg)] font-black text-2xl mb-2">¡Premio Desbloqueado!</h2>
                <p className="text-[var(--t-fg-muted)] text-sm mb-1">Has completado un año en La Costa Running Club.</p>
                <p className="text-[var(--t-accent2)] font-semibold text-sm mb-6">Medalla de oro aniversario 🏅</p>

                <button
                    id="reward-modal-close"
                    onClick={onClose}
                    className="w-full bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[var(--t-fg)] font-bold py-3 px-6 rounded-xl transition-colors"
                >
                    ¡Gracias!
                </button>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.85); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>,
        document.body
    )
}
