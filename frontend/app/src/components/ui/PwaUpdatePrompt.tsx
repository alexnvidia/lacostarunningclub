import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Muestra un toast en la esquina inferior derecha cuando hay una nueva
 * versión del Service Worker lista para activarse.
 *
 * Patrón: registerType: 'prompt' → el usuario elige cuándo actualizar.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl
                 bg-slate-800 px-4 py-3 text-sm text-white shadow-2xl ring-1 ring-white/10
                 animate-in slide-in-from-bottom-4"
    >
      <span className="flex items-center gap-2">
        🚀 <span>Nueva versión disponible</span>
      </span>
      <button
        className="rounded-lg bg-orange-500 px-3 py-1 font-semibold transition-colors
                   hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-orange-400"
        onClick={() => updateServiceWorker(true)}
      >
        Actualizar
      </button>
      <button
        aria-label="Cerrar notificación"
        className="ml-1 text-slate-400 transition-colors hover:text-white"
        onClick={() => setNeedRefresh(false)}
      >
        ✕
      </button>
    </div>
  )
}
