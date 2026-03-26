import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Package, User, MapPin, Clock } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'

interface OrderItem {
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    total: number
}

interface OrderDetail {
    id: string
    order_number: string
    user: { id: string; email: string; first_name: string; last_name: string }
    order_date: string
    status: string
    subtotal: number
    shipping_cost: number
    total: number
    shipping_address: { street: string; city: string; state?: string; postal_code: string; country: string }
    tracking_number: string | null
    items: OrderItem[]
    status_history: { previous_status: string | null; new_status: string; changed_at: string; comment?: string }[]
}

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    CONFIRMED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    SHIPPED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
    RETURNED: 'bg-gray-500/10 text-[var(--t-fg-muted)] border-gray-500/20',
}

interface UpdateForm {
    status: string
    tracking_number: string
}

export default function AdminPedidoDetalle() {
    const { id } = useParams<{ id: string }>()
    const qc = useQueryClient()

    const { data, isLoading } = useQuery<OrderDetail>({
        queryKey: queryKeys.admin.orderDetail(id!),
        queryFn: () => api.get(`/api/admin/orders/${id}`).then(r => r.data),
        enabled: !!id,
    })

    const { register, handleSubmit, formState: { isDirty } } = useForm<UpdateForm>({
        values: { status: data?.status ?? '', tracking_number: data?.tracking_number ?? '' }
    })

    const mutation = useMutation({
        mutationFn: (form: UpdateForm) =>
            api.patch(`/api/admin/orders/${id}`, {
                status: form.status,
                tracking_number: form.tracking_number || undefined,
            }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.admin.orderDetail(id!) })
            qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
        },
    })

    if (isLoading) return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-[var(--t-bg2)] rounded-2xl animate-pulse" />)}
            </div>
        </div>
    )
    if (!data) return <div className="text-center py-20 text-[var(--t-fg-dimmed)]">Pedido no encontrado</div>

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <Link to="/admin/pedidos" className="flex items-center gap-1 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a pedidos
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-1">Admin · Pedido</p>
                    <h1 className="text-3xl font-black text-[var(--t-fg)]">{data.order_number}</h1>
                    <p className="text-[var(--t-fg-dimmed)] text-sm mt-1">{formatDateTime(data.order_date)}</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full border font-medium ${STATUS_COLORS[data.status] ?? ''}`}>
                    {data.status}
                </span>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* Customer */}
                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-[var(--t-fg-dimmed)]" />
                        <span className="text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider">Cliente</span>
                    </div>
                    <p className="text-[var(--t-fg)] font-medium">{data.user.first_name} {data.user.last_name}</p>
                    <p className="text-[var(--t-fg-muted)] text-sm">{data.user.email}</p>
                </div>

                {/* Shipping */}
                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-[var(--t-fg-dimmed)]" />
                        <span className="text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider">Envío</span>
                    </div>
                    <p className="text-[var(--t-fg)] text-sm">{data.shipping_address.street}</p>
                    <p className="text-[var(--t-fg-muted)] text-sm">{data.shipping_address.postal_code} {data.shipping_address.city}</p>
                    <p className="text-[var(--t-fg-muted)] text-sm">{data.shipping_address.country}</p>
                </div>

                {/* Totals */}
                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-[var(--t-fg-dimmed)]" />
                        <span className="text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider">Importes</span>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-[var(--t-fg-muted)]"><span>Subtotal</span><span>{data.subtotal.toFixed(2)} €</span></div>
                        <div className="flex justify-between text-[var(--t-fg-muted)]"><span>Envío</span><span>{data.shipping_cost.toFixed(2)} €</span></div>
                        <div className="flex justify-between text-[var(--t-fg)] font-bold pt-1 border-t border-[var(--t-border)]"><span>Total</span><span>{data.total.toFixed(2)} €</span></div>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl overflow-hidden mb-4">
                <div className="px-6 py-3 border-b border-[var(--t-border)]">
                    <h2 className="text-[var(--t-fg)] font-bold text-sm">Productos ({data.items.length})</h2>
                </div>
                <div className="divide-y divide-[var(--t-border)]">
                    {data.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-6 py-4">
                            <div>
                                <p className="text-[var(--t-fg)] text-sm">{item.product_name}</p>
                                <p className="text-[var(--t-fg-dimmed)] text-xs">x{item.quantity} · {item.unit_price.toFixed(2)} € ud.</p>
                            </div>
                            <span className="text-[var(--t-fg)] font-semibold text-sm">{item.total.toFixed(2)} €</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Update form */}
            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-6 mb-4">
                <h2 className="text-[var(--t-fg)] font-bold mb-4">Gestionar pedido</h2>
                <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="order-status" className="block text-sm text-[var(--t-fg-muted)] mb-1.5">Estado</label>
                        <select
                            {...register('status')}
                            id="order-status"
                            className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] outline-none text-sm transition-colors"
                        >
                            {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tracking" className="block text-sm text-[var(--t-fg-muted)] mb-1.5">Número de seguimiento</label>
                        <input
                            {...register('tracking_number')}
                            id="tracking"
                            autoComplete="off"
                            placeholder="Ej. ES1234567890"
                            className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2.5 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <button
                            type="submit"
                            disabled={mutation.isPending || !isDirty}
                            className="bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-40 text-[var(--t-fg)] font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {mutation.isSuccess ? '✓ Guardado' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Status history */}
            {data.status_history.length > 0 && (
                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-[var(--t-fg-dimmed)]" />
                        <h2 className="text-[var(--t-fg)] font-bold">Historial de estados</h2>
                    </div>
                    <div className="space-y-3">
                        {data.status_history.map((h, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-accent)] mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-[var(--t-fg)]">
                                        {h.previous_status ? `${h.previous_status} → ` : ''}<strong>{h.new_status}</strong>
                                    </p>
                                    {h.comment && <p className="text-[var(--t-fg-dimmed)] text-xs">{h.comment}</p>}
                                    <p className="text-[var(--t-fg-dimmed)] text-xs">{formatDateTime(h.changed_at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
