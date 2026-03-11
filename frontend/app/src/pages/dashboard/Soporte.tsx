import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MessageSquare, Plus } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

const STATUS: Record<string, { label: string; color: string }> = {
    OPEN: { label: 'Abierto', color: 'text-green-400' },
    IN_PROGRESS: { label: 'En curso', color: 'text-blue-400' },
    RESOLVED: { label: 'Resuelto', color: 'text-gray-400' },
    CLOSED: { label: 'Cerrado', color: 'text-gray-600' },
}

export default function Soporte() {
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.tickets.list(),
        queryFn: () => api.get('/api/communication/messages').then(r => r.data),
    })

    const tickets = data?.messages ?? []

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-2">Ayuda</p>
                    <h1 className="text-3xl font-black text-white">Soporte</h1>
                </div>
                <Link to="/soporte/nuevo" className="flex items-center gap-2 bg-[#e63946] hover:bg-[#c1121f] text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all">
                    <Plus className="w-4 h-4" /> Nuevo ticket
                </Link>
            </div>

            {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-xl h-20 animate-pulse" />)}</div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-20">
                    <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No tienes tickets de soporte</p>
                    <Link to="/soporte/nuevo" className="text-[#e63946] hover:underline">Abrir tu primer ticket →</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket: { id: string; subject: string; status: string; category: string; created_at: string; unread_replies?: number }) => {
                        const s = STATUS[ticket.status] ?? { label: ticket.status, color: 'text-gray-400' }
                        return (
                            <Link key={ticket.id} to={`/soporte/${ticket.id}`} className="block bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e63946]/20 rounded-xl p-5 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-white truncate">{ticket.subject}</p>
                                            {(ticket.unread_replies ?? 0) > 0 && (
                                                <span className="bg-[#e63946] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0">{ticket.unread_replies}</span>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs capitalize">{ticket.category?.toLowerCase().replace('_', ' ')}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
                                        <p className="text-gray-600 text-xs mt-0.5">{formatDate(ticket.created_at)}</p>
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
