import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Users, ShoppingBag, Clock, TrendingUp, Shield, ChevronRight, Package } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'

interface Stats {
    total_users: number
    total_orders: number
    pending_orders: number
    total_revenue: number
    recent_orders: {
        id: string
        order_number: string
        user_email: string
        user_name: string
        order_date: string
        status: string
        total: number
        total_items: number
    }[]
}

const PERIODS = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'year', label: 'Este año' },
]

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400',
    CONFIRMED: 'bg-blue-500/10 text-blue-400',
    SHIPPED: 'bg-purple-500/10 text-purple-400',
    DELIVERED: 'bg-green-500/10 text-green-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
    RETURNED: 'bg-gray-500/10 text-[var(--t-fg-muted)]',
}

export default function AdminDashboard() {
    const [period, setPeriod] = useState('month')

    const { data, isLoading } = useQuery<Stats>({
        queryKey: queryKeys.admin.stats(period),
        queryFn: () => api.get(`/api/admin/stats?period=${period}`).then(r => r.data),
    })

    const kpis = [
        { label: 'Usuarios totales', value: data?.total_users ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Pedidos en periodo', value: data?.total_orders ?? 0, icon: ShoppingBag, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Pedidos pendientes', value: data?.pending_orders ?? 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { label: 'Ingresos', value: `${(data?.total_revenue ?? 0).toFixed(2)} €`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5 text-[var(--t-accent)]" />
                        <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider">Panel Admin</p>
                    </div>
                    <h1 className="text-3xl font-black text-[var(--t-fg)]">Dashboard</h1>
                </div>
                <div className="flex gap-1 bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl p-1">
                    {PERIODS.map(p => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.value
                                ? 'bg-[var(--t-accent)] text-[var(--t-fg)]'
                                : 'text-[var(--t-fg-muted)] hover:text-[var(--t-fg)]'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-5">
                        <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                        </div>
                        {isLoading
                            ? <div className="h-8 w-24 bg-[#2a2a2a] rounded animate-pulse mb-1" />
                            : <p className="text-2xl font-black text-[var(--t-fg)]">{kpi.value}</p>
                        }
                        <p className="text-[var(--t-fg-dimmed)] text-xs mt-1">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Nav cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                    { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
                    { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
                    { to: '/admin/suscripciones', label: 'Suscripciones', icon: TrendingUp },
                    { to: '/admin/tickets', label: 'Tickets', icon: Clock },
                    { to: '/admin/productos', label: 'Productos', icon: Package },
                ].map(nav => (
                    <Link
                        key={nav.to}
                        to={nav.to}
                        className="bg-[var(--t-bg2)] border border-[var(--t-border)] hover:border-[var(--t-accent)]/40 rounded-xl p-4 flex items-center gap-3 transition-all group"
                    >
                        <nav.icon className="w-4 h-4 text-[var(--t-fg-dimmed)] group-hover:text-[var(--t-accent)] transition-colors" />
                        <span className="text-sm text-[var(--t-fg)] group-hover:text-[var(--t-fg)] transition-colors">{nav.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--t-fg-dimmed)] ml-auto group-hover:text-[var(--t-accent)] transition-colors" />
                    </Link>
                ))}
            </div>

            {/* Recent orders */}
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--t-border)] flex items-center justify-between">
                    <h2 className="text-[var(--t-fg)] font-bold">Últimos pedidos</h2>
                    <Link to="/admin/pedidos" className="text-xs text-[var(--t-accent)] hover:underline">Ver todos</Link>
                </div>
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-[#2a2a2a] rounded animate-pulse" />)}
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--t-border)]">
                        {(data?.recent_orders ?? []).map(order => (
                            <Link
                                key={order.id}
                                to={`/admin/pedidos/${order.id}`}
                                className="flex items-center justify-between px-6 py-4 hover:bg-[#2a2a2a]/50 transition-colors group"
                            >
                                <div className="min-w-0">
                                    <p className="text-[var(--t-fg)] text-sm font-medium">{order.order_number}</p>
                                    <p className="text-[var(--t-fg-dimmed)] text-xs mt-0.5">{order.user_name} · {formatDateTime(order.order_date)}</p>
                                </div>
                                <div className="flex items-center gap-3 ml-4 shrink-0">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-500/10 text-[var(--t-fg-muted)]'}`}>
                                        {order.status}
                                    </span>
                                    <span className="text-[var(--t-fg)] text-sm font-semibold">{order.total.toFixed(2)} €</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-[var(--t-fg-dimmed)] group-hover:text-[var(--t-accent)]" />
                                </div>
                            </Link>
                        ))}
                        {(data?.recent_orders ?? []).length === 0 && (
                            <p className="text-center py-10 text-[var(--t-fg-dimmed)] text-sm">No hay pedidos recientes</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
