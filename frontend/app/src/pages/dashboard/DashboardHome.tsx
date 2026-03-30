import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, MessageSquare, Trophy, ChevronRight, User } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

export default function DashboardHome() {
    const { user } = useAuthStore()

    const { data: ordersData } = useQuery({
        queryKey: queryKeys.orders.list(),
        queryFn: () => api.get('/api/orders?limit=3').then(r => r.data),
    })

    const { data: resultsData } = useQuery({
        queryKey: queryKeys.performance.resultsMine(),
        queryFn: () => api.get('/api/performance/results?limit=3').then(r => r.data),
    })

    const orders: { id: string; order_number: string; status: string; total_amount: number; created_at: string }[] = ordersData?.orders ?? []
    const results: { id: string; race_name: string; race_date: string; distance: number; time: string }[] = resultsData?.results ?? []

    const STATUS_COLORS: Record<string, string> = {
        PENDING: 'text-yellow-400', CONFIRMED: 'text-blue-400',
        SHIPPED: 'text-purple-400', DELIVERED: 'text-green-400',
        CANCELLED: 'text-[var(--t-fg-dimmed)]', RETURNED: 'text-[var(--t-accent)]',
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Greeting */}
            <div className="mb-10">
                <p className="text-[var(--t-fg-dimmed)] text-sm mb-1">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="text-3xl font-black text-[var(--t-fg)]">Hola, {user?.firstName} 👋</h1>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                {[
                    { to: '/perfil', icon: User, label: 'Mi Perfil' },
                    { to: '/pedidos', icon: ShoppingBag, label: 'Mis Pedidos' },
                    { to: '/mis-carreras', icon: Trophy, label: 'Mis Carreras' },
                    { to: '/soporte', icon: MessageSquare, label: 'Soporte' },
                ].map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} className="bg-[var(--t-bg2)] border border-[var(--t-border)] hover:border-[var(--t-accent)]/30 rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5">
                        <Icon className="w-5 h-5 text-[var(--t-accent)]" />
                        <span className="text-[var(--t-fg)] text-sm font-medium">{label}</span>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Latest orders */}
                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--t-border)]">
                        <h2 className="font-semibold text-[var(--t-fg)]">Últimos pedidos</h2>
                        <Link to="/pedidos" className="text-xs text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] flex items-center gap-1">
                            Ver todos <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {orders.length === 0 ? (
                        <p className="text-[var(--t-fg-dimmed)] text-sm text-center py-8">Sin pedidos todavía</p>
                    ) : (
                        <ul className="divide-y divide-[var(--t-border)]">
                            {orders.slice(0, 3).map((order) => (
                                <li key={order.id}>
                                    <Link to={`/pedidos/${order.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#2a2a2a]/50 transition-colors">
                                        <div>
                                            <p className="text-[var(--t-fg)] text-sm font-medium">#{order.order_number}</p>
                                            <p className="text-[var(--t-fg-dimmed)] text-xs">{formatDate(order.created_at)}</p>
                                        </div>
                                        <span className={`text-xs font-medium ${STATUS_COLORS[order.status] ?? 'text-[var(--t-fg-muted)]'}`}>
                                            {order.status}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Recent results */}
                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--t-border)]">
                        <h2 className="font-semibold text-[var(--t-fg)]">Mis carreras</h2>
                        <Link to="/mis-carreras" className="text-xs text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] flex items-center gap-1">
                            Ver todas <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {results.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-[var(--t-fg-dimmed)] text-sm mb-3">Aún no has subido resultados</p>
                            <Link to="/subir-resultado" className="text-[var(--t-accent)] text-sm hover:underline">
                                Subir tu primer resultado →
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-[var(--t-border)]">
                            {results.slice(0, 3).map((r) => (
                                <li key={r.id} className="flex items-center justify-between px-5 py-3">
                                    <div>
                                        <p className="text-[var(--t-fg)] text-sm font-medium">{r.race_name || 'Entrenamiento'}</p>
                                        <p className="text-[var(--t-fg-dimmed)] text-xs">{formatDate(r.race_date)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[var(--t-accent)] font-bold text-sm">{r.distance}km</span>
                                        {r.time && <p className="text-[var(--t-fg-muted)] text-xs">{r.time}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
