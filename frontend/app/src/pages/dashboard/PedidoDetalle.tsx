import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate, formatPrice } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function PedidoDetalle() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const qc = useQueryClient()

    const { data: order, isLoading } = useQuery({
        queryKey: queryKeys.orders.detail(id!),
        queryFn: () => api.get(`/api/orders/${id}`).then(r => r.data),
        enabled: !!id,
    })

    const cancelMutation = useMutation({
        mutationFn: () => api.delete(`/api/orders/${id}`).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.orders.list() })
            navigate('/pedidos')
        },
    })

    const STATUS: Record<string, { label: string; color: string }> = {
        PENDING: { label: 'Pendiente', color: 'text-yellow-400' },
        CONFIRMED: { label: 'Confirmado', color: 'text-blue-400' },
        SHIPPED: { label: 'Enviado', color: 'text-purple-400' },
        DELIVERED: { label: 'Entregado', color: 'text-green-400' },
        CANCELLED: { label: 'Cancelado', color: 'text-gray-500' },
    }

    if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-12"><div className="bg-[#1a1a1a] rounded-2xl h-64 animate-pulse" /></div>
    if (!order) return <div className="text-center py-20 text-gray-500">Pedido no encontrado</div>

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
            <button onClick={() => navigate('/pedidos')} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a pedidos
            </button>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-[#2a2a2a]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white">Pedido #{order.order_number}</h1>
                            <p className="text-gray-500 text-sm flex items-center gap-1 mt-1"><Calendar className="w-3.5 h-3.5" />{formatDate(order.created_at)}</p>
                        </div>
                        <span className={`font-semibold ${STATUS[order.status]?.color ?? 'text-gray-400'}`}>{STATUS[order.status]?.label ?? order.status}</span>
                    </div>
                </div>

                {/* Items */}
                {order.items?.length > 0 && (
                    <div className="px-6 py-4 border-b border-[#2a2a2a]">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Productos</p>
                        <div className="space-y-3">
                            {order.items.map((item: { id: string; product_name: string; size?: string; quantity: number; unit_price: number }) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm">{item.product_name}</p>
                                        {item.size && <p className="text-gray-500 text-xs">Talla: {item.size}</p>}
                                    </div>
                                    <p className="text-white text-sm">{item.quantity} × {formatPrice(item.unit_price)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Address */}
                {order.shipping_address && (
                    <div className="px-6 py-4 border-b border-[#2a2a2a]">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" />Dirección de envío</p>
                        <p className="text-gray-300 text-sm">{order.shipping_address.street}, {order.shipping_address.city}</p>
                    </div>
                )}

                {/* Total */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <span className="text-gray-400">Total del pedido</span>
                    <span className="text-2xl font-black text-white">{formatPrice(order.total_amount)}</span>
                </div>

                {/* Cancel */}
                {order.status === 'PENDING' && (
                    <div className="px-6 pb-5">
                        <button
                            onClick={() => { if (confirm('¿Cancelar este pedido?')) cancelMutation.mutate() }}
                            disabled={cancelMutation.isPending}
                            className="text-[#e63946] border border-[#e63946]/30 hover:bg-[#e63946]/10 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
