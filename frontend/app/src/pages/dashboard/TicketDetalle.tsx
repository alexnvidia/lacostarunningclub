import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Send } from 'lucide-react'
import { useRef, useEffect } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'

export default function TicketDetalle() {
    const { id } = useParams<{ id: string }>()
    const qc = useQueryClient()
    const msgEndRef = useRef<HTMLDivElement>(null)

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.tickets.detail(id!),
        queryFn: () => api.get(`/api/messages/${id}`).then(r => r.data),
        enabled: !!id,
        refetchInterval: 15000, // Polling cada 15s
    })

    const { register, handleSubmit, reset } = useForm<{ content: string }>()

    const replyMutation = useMutation({
        mutationFn: (data: { content: string }) =>
            api.post(`/api/messages/${id}/replies`, data).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.tickets.detail(id!) })
            reset()
        },
    })

    useEffect(() => {
        msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [data])

    if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-12"><div className="bg-[#1a1a1a] rounded-2xl h-64 animate-pulse" /></div>
    if (!data) return <div className="text-center py-20 text-gray-500">Ticket no encontrado</div>

    const ticket = data.ticket
    const messages = data.messages ?? []

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col min-h-[calc(100vh-4rem)]">
            <Link to="/soporte" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a soporte
            </Link>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden flex flex-col flex-1">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#2a2a2a]">
                    <h1 className="font-bold text-white text-lg">{ticket.subject}</h1>
                    <p className="text-gray-500 text-xs mt-1 capitalize">{ticket.category?.toLowerCase().replace('_', ' ')} · {ticket.status}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
                    {messages.map((msg: { id: string; content: string; sender_type: string; sender_name?: string; created_at: string }) => {
                        const isMe = msg.sender_type === 'USER'
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isMe
                                    ? 'bg-[#e63946] text-white rounded-tr-sm'
                                    : 'bg-[#2a2a2a] text-gray-200 rounded-tl-sm'
                                    }`}>
                                    {!isMe && <p className="text-xs text-gray-400 mb-1 font-medium">{msg.sender_name ?? 'LCRC'}</p>}
                                    <p className="leading-relaxed">{msg.content}</p>
                                    <p className={`text-[10px] mt-1.5 ${isMe ? 'text-white/60' : 'text-gray-500'}`}>{formatDateTime(msg.created_at)}</p>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={msgEndRef} />
                </div>

                {/* Reply form */}
                {ticket.status !== 'CLOSED' && (
                    <form
                        onSubmit={handleSubmit((d) => replyMutation.mutate(d))}
                        className="p-4 border-t border-[#2a2a2a] flex gap-3"
                    >
                        <input
                            {...register('content', { required: true })}
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 outline-none text-sm transition-colors"
                        />
                        <button type="submit" disabled={replyMutation.isPending} className="bg-[#e63946] hover:bg-[#c1121f] text-white p-2.5 rounded-xl transition-colors disabled:opacity-50">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
