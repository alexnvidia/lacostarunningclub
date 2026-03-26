import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ShoppingBag, ChevronRight, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'

interface Order {
    id: string
    order_number: string
    user_email: string
    user_name: string
    order_date: string
    status: string
    total: number
    total_items: number
}

interface OrdersResponse {
    orders: Order[]
    pagination: { page: number; limit: number; total: number; total_pages: number }
}

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400',
    CONFIRMED: 'bg-blue-500/10 text-blue-400',
    SHIPPED: 'bg-purple-500/10 text-purple-400',
    DELIVERED: 'bg-green-500/10 text-green-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
    RETURNED: 'bg-gray-500/10 text-[var(--t-fg-muted)]',
}

export default function AdminPedidos() {
    const [status, setStatus] = useState('')
    const [page, setPage] = useState(1)

    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)

    const { data, isLoading } = useQuery<OrdersResponse>({
        queryKey: queryKeys.admin.orders(status || undefined, page),
        queryFn: () => api.get(`/api/admin/orders?${params}`).then(r => r.data),
    })

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <Link to="/admin" className="flex items-center gap-1 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Panel Admin
            </Link>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-1">Admin</p>
                    <h1 className="text-3xl font-black text-[var(--t-fg)] flex items-center gap-2">
                        <ShoppingBag className="w-7 h-7" /> Pedidos
                    </h1>
                </div>
                <div className="flex gap-1 bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl p-1 flex-wrap">
                    {STATUSES.map(s => (
                        <button
                            key={s || 'all'}
                            onClick={() => { setStatus(s); setPage(1) }}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${status === s ? 'bg-[var(--t-accent)] text-[var(--t-fg)]' : 'text-[var(--t-fg-muted)] hover:text-[var(--t-fg)]'
                                }`}
                        >
                            {s || 'Todos'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[var(--t-border)] text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider">
                    <span>Pedido</span><span>Cliente</span><span>Fecha</span><span>Estado</span><span>Total</span><span />
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#2a2a2a] rounded animate-pulse" />)}
                    </div>
                ) : (data?.orders ?? []).length === 0 ? (
                    <p className="text-center py-16 text-[var(--t-fg-dimmed)]">No hay pedidos</p>
                ) : (
                    <div className="divide-y divide-[var(--t-border)]">
                        {data!.orders.map(order => (
                            <Link
                                key={order.id}
                                to={`/admin/pedidos/${order.id}`}
                                className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-[#2a2a2a]/50 transition-colors group"
                            >
                                <span className="text-[var(--t-fg)] text-sm font-medium">{order.order_number}</span>
                                <div className="min-w-0">
                                    <p className="text-sm text-[var(--t-fg)] truncate">{order.user_name}</p>
                                    <p className="text-xs text-[var(--t-fg-dimmed)] truncate">{order.user_email}</p>
                                </div>
                                <span className="text-xs text-[var(--t-fg-muted)]">{formatDateTime(order.order_date)}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[order.status] ?? 'bg-gray-500/10 text-[var(--t-fg-muted)]'}`}>
                                    {order.status}
                                </span>
                                <span className="text-[var(--t-fg)] text-sm font-semibold">{order.total.toFixed(2)} €</span>
                                <ChevronRight className="w-4 h-4 text-[var(--t-fg-dimmed)] group-hover:text-[var(--t-accent)]" />
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {data && data.pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--t-border)]">
                        <p className="text-xs text-[var(--t-fg-dimmed)]">{data.pagination.total} pedidos en total</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-[var(--t-fg-muted)] rounded-lg text-xs disabled:opacity-40 hover:bg-[#333] transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1.5 text-xs text-[var(--t-fg-muted)]">{page} / {data.pagination.total_pages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))}
                                disabled={page === data.pagination.total_pages}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-[var(--t-fg-muted)] rounded-lg text-xs disabled:opacity-40 hover:bg-[#333] transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
