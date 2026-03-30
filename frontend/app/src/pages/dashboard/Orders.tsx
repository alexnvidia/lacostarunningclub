import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate, formatPrice } from '@/lib/utils'

const STATUS: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-400/10' },
    CONFIRMED: { label: 'Confirmado', color: 'text-blue-400 bg-blue-400/10' },
    SHIPPED: { label: 'Enviado', color: 'text-purple-400 bg-purple-400/10' },
    DELIVERED: { label: 'Entregado', color: 'text-green-400 bg-green-400/10' },
    CANCELLED: { label: 'Cancelado', color: 'text-[var(--t-fg-dimmed)] bg-gray-500/10' },
    RETURNED: { label: 'Devuelto', color: 'text-[var(--t-accent)] bg-[var(--t-accent)]/10' },
}

export default function Orders() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.orders.list(),
        queryFn: () => api.get('/api/orders').then(r => r.data),
    })

    const orders = data?.orders ?? []

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-2">Mi cuenta</p>
                <h1 className="text-3xl font-black text-[var(--t-fg)]">Mis Pedidos</h1>
            </div>

            {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[var(--t-bg2)] rounded-xl h-20 animate-pulse" />)}</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20">
                    <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-[var(--t-fg-dimmed)] mb-4">Aún no tienes pedidos</p>
                    <Link to="/tienda" className="text-[var(--t-accent)] hover:underline">Visita la tienda →</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order: { id: string; order_number: string; status: string; total_amount: number; created_at: string; items?: unknown[] }) => {
                        const s = STATUS[order.status] ?? { label: order.status, color: 'text-[var(--t-fg-muted)] bg-gray-400/10' }
                        return (
                            <Link key={order.id} to={`/pedidos/${order.id}`} className="block bg-[var(--t-bg2)] border border-[var(--t-border)] hover:border-[var(--t-accent)]/20 rounded-xl p-5 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold text-[var(--t-fg)]">#{order.order_number}</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                                        </div>
                                        <p className="text-[var(--t-fg-dimmed)] text-sm">{formatDate(order.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-[var(--t-fg)]">{formatPrice(order.total_amount)}</span>
                                        <ChevronRight className="w-4 h-4 text-[var(--t-fg-dimmed)]" />
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
