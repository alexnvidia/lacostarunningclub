import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Zap, Trophy, Users, ShoppingBag, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

interface WorkoutData {
    title: string
    description: string
    workout_type: string
    estimated_duration: number
    estimated_distance: number
    difficulty_level: string
}

interface PublicResult {
    id: string
    user_name: string
    race_name: string
    race_date: string
    distance: number
    time: string
    pace: string
}

export default function Home() {
    const { data: workout } = useQuery({
        queryKey: queryKeys.performance.workout(),
        queryFn: () => api.get<WorkoutData>('/api/performance/workouts').then(r => r.data),
        staleTime: 60 * 60 * 1000, // 1h
    })

    const { data: resultsData } = useQuery({
        queryKey: queryKeys.performance.resultsPublic(1),
        queryFn: () => api.get<{ results: PublicResult[] }>('/api/performance/results/public?limit=4').then(r => r.data),
        staleTime: 5 * 60 * 1000,
    })

    const results = resultsData?.results ?? []

    const difficultyColor = {
        beginner: 'text-green-400',
        intermediate: 'text-yellow-400',
        advanced: 'text-[#e63946]',
    }

    return (
        <div className="text-white">
            {/* HERO */}
            <section className="relative min-h-[90vh] flex items-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] via-[#1a0d0d] to-[#0d0d0d]" />
                {/* Decorative blur */}
                <div className="absolute top-20 right-20 w-96 h-96 bg-[#e63946]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#f4a261]/5 rounded-full blur-3xl" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 bg-[#e63946]/10 border border-[#e63946]/20 rounded-full px-4 py-1.5 mb-6">
                            <Zap className="w-3.5 h-3.5 text-[#e63946]" />
                            <span className="text-[#e63946] text-xs font-medium uppercase tracking-wider">Fuengirola · Costa del Sol</span>
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black leading-none mb-6">
                            Corre con<br />
                            <span className="text-[#e63946]">nosotros.</span>
                        </h1>
                        <p className="text-gray-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl">
                            Somos el club de running de la Costa del Sol. Entrenamos juntos, compartimos resultados y nos apoyamos cada kilómetro.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/registro"
                                className="inline-flex items-center justify-center gap-2 bg-[#e63946] hover:bg-[#c1121f] text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Únete al club
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/performance"
                                className="inline-flex items-center justify-center gap-2 border border-[#2a2a2a] hover:border-[#3a3a3a] text-white font-semibold px-8 py-4 rounded-xl transition-colors"
                            >
                                Ver workouts
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* STATS STRIP */}
            <section className="bg-[#1a1a1a] border-y border-[#2a2a2a]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                            { icon: Users, value: '300+', label: 'Corredores' },
                            { icon: Trophy, value: '500+', label: 'Carreras completadas' },
                            { icon: Zap, value: '52', label: 'Workouts al año' },
                        ].map(({ icon: Icon, value, label }) => (
                            <div key={label} className="flex flex-col items-center gap-1">
                                <Icon className="w-5 h-5 text-[#e63946] mb-1" />
                                <span className="text-2xl sm:text-3xl font-black text-white">{value}</span>
                                <span className="text-gray-500 text-xs sm:text-sm">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* WORKOUT SEMANAL */}
            {workout && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-1">Esta semana</p>
                            <h2 className="text-3xl font-bold">Workout del club</h2>
                        </div>
                        <Link to="/performance" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
                            Ver todos <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 hover:border-[#e63946]/30 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`text-xs font-medium capitalize ${difficultyColor[workout.difficulty_level as keyof typeof difficultyColor] ?? 'text-gray-400'}`}>
                                        {workout.difficulty_level}
                                    </span>
                                    <span className="text-gray-600">·</span>
                                    <span className="text-gray-400 text-xs capitalize">{workout.workout_type}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2">{workout.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{workout.description}</p>
                            </div>
                            <div className="flex sm:flex-col gap-4 sm:gap-2 sm:text-right shrink-0">
                                <div>
                                    <p className="text-2xl font-bold">{workout.estimated_distance}<span className="text-sm text-gray-400 ml-1">km</span></p>
                                    <p className="text-gray-500 text-xs">Distancia</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{workout.estimated_duration}<span className="text-sm text-gray-400 ml-1">min</span></p>
                                    <p className="text-gray-500 text-xs">Duración</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                            <Link to="/performance" className="inline-flex items-center gap-1 text-[#e63946] text-sm font-medium hover:underline">
                                Ver plan completo <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ÚLTIMOS RESULTADOS */}
            {results.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-1">Comunidad</p>
                            <h2 className="text-3xl font-bold">Últimos resultados</h2>
                        </div>
                        <Link to="/performance" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
                            Ver todos <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {results.map((result) => (
                            <div key={result.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#e63946]/20 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-white">{result.user_name}</p>
                                        <p className="text-gray-400 text-sm mt-0.5">{result.race_name || 'Entrenamiento'}</p>
                                        <p className="text-gray-600 text-xs mt-1">{formatDate(result.race_date)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#e63946] font-bold text-lg">{result.distance}km</p>
                                        {result.time && <p className="text-gray-300 text-sm">{result.time}</p>}
                                        {result.pace && <p className="text-gray-500 text-xs">{result.pace}/km</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* TIENDA CTA */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-gradient-to-r from-[#e63946]/10 to-[#f4a261]/10 border border-[#e63946]/20 rounded-2xl p-8 sm:p-12 text-center">
                    <ShoppingBag className="w-10 h-10 text-[#e63946] mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-3">Lleva el club contigo</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">Camisetas oficiales LCRC para hombre y mujer. Corre con orgullo.</p>
                    <Link
                        to="/tienda"
                        className="inline-flex items-center gap-2 bg-[#e63946] hover:bg-[#c1121f] text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-[1.02]"
                    >
                        Ver tienda <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>
        </div>
    )
}
