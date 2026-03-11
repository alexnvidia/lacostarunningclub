import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Send } from 'lucide-react'
import { useRef, useEffect } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'

interface Reply {
    id: string
    reply: string
    is_admin: boolean
    created_at: string
}

interface TicketData {
    id: string
    subject: string
    category: string | null
    priority: string
    status: string
    created_at: string
    replies: Reply[]
}

export default function TicketDetalle() {
    const { id } = useParams<{ id: string }>()
    const qc = useQueryClient()
    const msgEndRef = useRef<HTMLDivElement>(null)

    const { data, isLoading } = useQuery<TicketData>({
        queryKey: queryKeys.tickets.detail(id!),
        queryFn: () => api.get(`/api/communication/messages/${id}`).then(r => r.data),
        enabled: !!id,
        staleTime: 0,          // siempre refresca al entrar para tener el status real
        refetchInterval: 15000,
    })

    const { register, handleSubmit, reset } = useForm<{ reply: string }>()

    const replyMutation = useMutation({
        mutationFn: (d: { reply: string }) =>
            api.post(`/api/communication/messages/${id}/replies`, d).then(r => r.data),
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

    const STATUS_LABEL: Record<string, string> = {
        open: 'Abierto', in_progress: 'En curso', resolved: 'Resuelto', closed: 'Cerrado',
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col min-h-[calc(100vh-4rem)]">
            <Link to="/soporte" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a soporte
            </Link>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden flex flex-col flex-1">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#2a2a2a]">
                    <h1 className="font-bold text-white text-lg">{data.subject}</h1>
                    <p className="text-gray-500 text-xs mt-1 capitalize">
                        {data.category?.replace('_', ' ')} · {STATUS_LABEL[data.status] ?? data.status}
                    </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
                    {data.replies.map((msg) => (
                        <Bubble
                            key={msg.id}
                            isMe={!msg.is_admin}
                            text={msg.reply}
                            date={msg.created_at}
                            senderLabel={msg.is_admin ? 'LCRC' : undefined}
                        />
                    ))}
                    <div ref={msgEndRef} />
                </div>

                {/* Reply form — hidden when ticket is closed or resolved */}
                {data.status === 'closed' || data.status === 'resolved' ? (
                    <div className="p-4 border-t border-[#2a2a2a] text-center text-xs text-gray-600">
                        Este ticket está {data.status === 'closed' ? 'cerrado' : 'resuelto'} y no admite más respuestas.
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit((d) => replyMutation.mutate(d))}
                        className="p-4 border-t border-[#2a2a2a] flex gap-3"
                    >
                        <input
                            {...register('reply', { required: true })}
                            id="reply"
                            autoComplete="off"
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 outline-none text-sm transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={replyMutation.isPending}
                            className="bg-[#e63946] hover:bg-[#c1121f] text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

function Bubble({ isMe, text, date, senderLabel }: {
    isMe: boolean
    text: string
    date: string
    senderLabel?: string
}) {
    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isMe
                ? 'bg-[#e63946] text-white rounded-tr-sm'
                : 'bg-[#2a2a2a] text-gray-200 rounded-tl-sm'
                }`}>
                {!isMe && senderLabel && (
                    <p className="text-xs text-gray-400 mb-1 font-medium">{senderLabel}</p>
                )}
                <p className="leading-relaxed">{text}</p>
                <p className={`text-[10px] mt-1.5 ${isMe ? 'text-white/60' : 'text-gray-500'}`}>
                    {formatDateTime(date)}
                </p>
            </div>
        </div>
    )
}
