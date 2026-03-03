import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, Map, Upload } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

interface WorkoutData {
    title: string; description: string; workout_type: string
    estimated_duration: number; estimated_distance: number
    difficulty_level: string; warmup?: string; main_set?: string; cooldown?: string
}
interface PublicResult {
    id: string; user_name: string; race_name: string; race_date: string
    distance: number; time: string; pace: string; location?: string
}

export default function Performance() {
    const { isAuthenticated } = useAuthStore()

    const { data: workout, isLoading: loadingWorkout } = useQuery({
        queryKey: queryKeys.performance.workout(),
        queryFn: () => api.get<WorkoutData>('/api/performance/workouts').then(r => r.data),
        staleTime: 60 * 60 * 1000,
    })

    const { data: resultsData, isLoading: loadingResults } = useQuery({
        queryKey: queryKeys.performance.resultsPublic(1),
        queryFn: () => api.get<{ results: PublicResult[] }>('/api/performance/results/public?limit=10').then(r => r.data),
        staleTime: 5 * 60 * 1000,
    })

    const results = resultsData?.results ?? []

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-10">
                <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-2">Performance Crew</p>
                <h1 className="text-4xl font-black text-white">Entrena con el club</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Workout column */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-4">Workout de la semana</h2>
                    {loadingWorkout ? (
                        <div className="bg-[#1a1a1a] rounded-2xl h-64 animate-pulse" />
                    ) : workout ? (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4 text-sm text-gray-400">
                                <span className="bg-[#e63946]/10 text-[#e63946] px-3 py-1 rounded-full capitalize">{workout.workout_type}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{workout.estimated_duration} min</span>
                                <span className="flex items-center gap-1"><Map className="w-3.5 h-3.5" />{workout.estimated_distance} km</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">{workout.title}</h3>
                            <p className="text-gray-400 leading-relaxed mb-6">{workout.description}</p>
                            {(workout.warmup || workout.main_set || workout.cooldown) && (
                                <div className="space-y-3 border-t border-[#2a2a2a] pt-5">
                                    {workout.warmup && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Calentamiento</p>
                                            <p className="text-gray-300 text-sm">{workout.warmup}</p>
                                        </div>
                                    )}
                                    {workout.main_set && (
                                        <div>
                                            <p className="text-xs text-[#e63946] uppercase tracking-wider mb-1">Parte principal</p>
                                            <p className="text-gray-300 text-sm">{workout.main_set}</p>
                                        </div>
                                    )}
                                    {workout.cooldown && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vuelta a la calma</p>
                                            <p className="text-gray-300 text-sm">{workout.cooldown}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center text-gray-500">
                            No hay workout publicado esta semana
                        </div>
                    )}

                    {/* CTA subir resultado */}
                    {isAuthenticated ? (
                        <Link to="/subir-resultado" className="mt-4 flex items-center justify-center gap-2 bg-[#e63946]/10 hover:bg-[#e63946]/20 border border-[#e63946]/20 text-[#e63946] py-3 rounded-xl font-medium text-sm transition-colors">
                            <Upload className="w-4 h-4" /> Subir mi resultado de carrera
                        </Link>
                    ) : (
                        <Link to="/registro" className="mt-4 flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 py-3 rounded-xl text-sm transition-colors">
                            Únete para subir tus resultados
                        </Link>
                    )}
                </div>

                {/* Results feed */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4">Últimos resultados</h2>
                    {loadingResults ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-xl h-16 animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {results.map((r) => (
                                <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-white text-sm">{r.user_name}</p>
                                            <p className="text-gray-500 text-xs">{r.race_name || 'Entrenamiento'} · {formatDate(r.race_date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[#e63946] font-bold">{r.distance}km</p>
                                            {r.time && <p className="text-gray-400 text-xs">{r.time}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
