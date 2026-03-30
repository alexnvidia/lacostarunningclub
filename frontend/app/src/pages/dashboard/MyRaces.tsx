import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Trophy, Upload } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

interface MyResult {
    id: string; race_name: string; race_date: string
    distance: number; time: string; pace: string
    location?: string; surface_type?: string; is_public: boolean
}

export default function MyRaces() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.performance.resultsMine(),
        queryFn: () => api.get<{ results: MyResult[] }>('/api/performance/results').then(r => r.data),
    })

    const results = data?.results ?? []

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-2">Mi historial</p>
                    <h1 className="text-3xl font-black text-[var(--t-fg)]">Mis Carreras</h1>
                </div>
                <Link to="/subir-resultado" className="flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[var(--t-fg)] font-semibold px-4 py-2.5 rounded-lg text-sm transition-all">
                    <Upload className="w-4 h-4" /> Subir resultado
                </Link>
            </div>

            {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-[var(--t-bg2)] rounded-xl h-20 animate-pulse" />)}</div>
            ) : results.length === 0 ? (
                <div className="text-center py-20">
                    <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-[var(--t-fg-dimmed)] mb-4">Aún no has subido ningún resultado</p>
                    <Link to="/subir-resultado" className="text-[var(--t-accent)] hover:underline">Subir tu primer resultado →</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {results.map((r) => (
                        <div key={r.id} className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-[var(--t-fg)] truncate">{r.race_name || 'Entrenamiento'}</p>
                                        {r.is_public && <span className="text-[10px] bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded-full shrink-0">Público</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[var(--t-fg-dimmed)]">
                                        <span>{formatDate(r.race_date)}</span>
                                        {r.location && <span>· {r.location}</span>}
                                        {r.surface_type && <span>· {r.surface_type}</span>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                    <p className="text-[var(--t-accent)] font-bold text-lg">{r.distance}km</p>
                                    {r.time && <p className="text-[var(--t-fg)] text-sm">{r.time}</p>}
                                    {r.pace && <p className="text-[var(--t-fg-dimmed)] text-xs">{r.pace}/km</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
