import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { MessageSquare, ArrowLeft, ChevronRight, UserCheck, UserX } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

interface Ticket {
    id: string
    subject: string
    category: string | null
    priority: string
    status: string
    created_at: string
    unread_replies?: number
    assigned_to_user_id?: string | null
}

interface TicketsResponse {
    messages: Ticket[]
    pagination?: { page: number; limit: number; total: number; total_pages: number }
}

interface SupportAgent {
    id: string
    email: string
    first_name: string
    last_name?: string | null
    role: string
}

interface AgentsResponse {
    users: SupportAgent[]
}

const STATUS_OPTIONS = ['', 'open', 'in_progress', 'resolved', 'closed']
const ASSIGN_FILTER_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'me', label: 'Mis tickets' },
    { value: 'unassigned', label: 'Sin asignar' },
]

const STATUS_COLORS: Record<string, string> = {
    open: 'bg-green-500/10 text-green-400',
    in_progress: 'bg-yellow-500/10 text-yellow-400',
    resolved: 'bg-blue-500/10 text-blue-400',
    closed: 'bg-gray-500/10 text-[var(--t-fg-muted)]',
}

const STATUS_LABELS: Record<string, string> = {
    open: 'Abierto',
    in_progress: 'En curso',
    resolved: 'Resuelto',
    closed: 'Cerrado',
}

export default function AdminTickets() {
    const [filterStatus, setFilterStatus] = useState('')
    const [filterAssigned, setFilterAssigned] = useState('')
    const qc = useQueryClient()
    const me = useAuthStore(s => s.user)

    const { data, isLoading } = useQuery<TicketsResponse>({
        queryKey: queryKeys.admin.tickets(filterStatus || undefined, filterAssigned || undefined),
        queryFn: () => {
            const params = new URLSearchParams({ limit: '50' })
            if (filterStatus) params.set('status', filterStatus)
            if (filterAssigned) params.set('assigned_to', filterAssigned)
            return api.get(`/api/communication/messages?${params}`).then(r => r.data)
        },
    })

    // Load SUPPORT agents + include ADMIN users for assignment
    const { data: agentsData } = useQuery<AgentsResponse>({
        queryKey: ['admin', 'agents', 'support'],
        queryFn: () => api.get('/api/users?role=SUPPORT').then(r => r.data),
        staleTime: 5 * 60 * 1000,
    })

    const agents: SupportAgent[] = agentsData?.users ?? []
    // Ensure the logged-in admin also appears in the list if not already there
    const agentOptions: SupportAgent[] = me
        ? [
            ...(agents.some(a => a.id === me.id)
                ? agents
                : [{ id: me.id, email: me.email, first_name: me.firstName, last_name: me.lastName, role: me.role.toLowerCase() }, ...agents])
        ]
        : agents

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch(`/api/communication/messages/${id}`, { status }).then(r => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tickets'] }),
    })

    const assignMutation = useMutation({
        mutationFn: ({ id, assigned_to_user_id }: { id: string; assigned_to_user_id: string | null }) =>
            api.patch(`/api/communication/messages/${id}`, { assigned_to_user_id }).then(r => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tickets'] }),
    })

    const tickets = data?.messages ?? []

    const getAgentLabel = (agentId?: string | null) => {
        if (!agentId) return null
        const agent = agentOptions.find(a => a.id === agentId)
        if (!agent) return agentId.slice(0, 8) + '…'
        return `${agent.first_name}${agent.last_name ? ' ' + agent.last_name : ''}`
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <Link to="/admin" className="flex items-center gap-1 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Panel Admin
            </Link>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-1">Admin</p>
                    <h1 className="text-3xl font-black text-[var(--t-fg)] flex items-center gap-2">
                        <MessageSquare className="w-7 h-7" /> Tickets de soporte
                    </h1>
                </div>

                <div className="flex flex-col gap-2 items-end">
                    {/* Status filter */}
                    <div className="flex gap-1 bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl p-1">
                        {STATUS_OPTIONS.map(s => (
                            <button
                                key={s || 'all'}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? 'bg-[var(--t-accent)] text-[var(--t-fg)]' : 'text-[var(--t-fg-muted)] hover:text-[var(--t-fg)]'
                                    }`}
                            >
                                {s ? STATUS_LABELS[s] : 'Todos'}
                            </button>
                        ))}
                    </div>

                    {/* Assignment filter */}
                    <div className="flex gap-1 bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl p-1">
                        {ASSIGN_FILTER_OPTIONS.map(opt => (
                            <button
                                key={opt.value || 'all-assign'}
                                onClick={() => setFilterAssigned(opt.value)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterAssigned === opt.value ? 'bg-[var(--t-accent)] text-[var(--t-fg)]' : 'text-[var(--t-fg-muted)] hover:text-[var(--t-fg)]'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1.5fr_auto] gap-4 px-6 py-3 border-b border-[var(--t-border)] text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider">
                    <span>Asunto</span><span>Categoría</span><span>Prioridad</span><span>Estado</span><span>Agente</span><span>Ver</span>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-[#2a2a2a] rounded animate-pulse" />)}
                    </div>
                ) : tickets.length === 0 ? (
                    <p className="text-center py-16 text-[var(--t-fg-dimmed)]">No hay tickets</p>
                ) : (
                    <div className="divide-y divide-[var(--t-border)]">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="grid grid-cols-[3fr_1fr_1fr_1fr_1.5fr_auto] gap-4 items-center px-6 py-4">
                                <div>
                                    <p className="text-[var(--t-fg)] text-sm font-medium line-clamp-1">{ticket.subject}</p>
                                    <p className="text-[var(--t-fg-dimmed)] text-xs mt-0.5">{formatDateTime(ticket.created_at)}</p>
                                </div>
                                <p className="text-[var(--t-fg-muted)] text-xs capitalize">{ticket.category?.replace('_', ' ') ?? '—'}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                                    ticket.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                                        'bg-gray-500/10 text-[var(--t-fg-muted)]'
                                    }`}>
                                    {ticket.priority}
                                </span>
                                {/* Inline status change */}
                                <select
                                    value={ticket.status}
                                    onChange={e => statusMutation.mutate({ id: ticket.id, status: e.target.value })}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium outline-none cursor-pointer border-0 ${STATUS_COLORS[ticket.status] ?? ''}`}
                                    style={{ backgroundImage: 'none' }}
                                >
                                    {STATUS_OPTIONS.filter(Boolean).map(s => (
                                        <option key={s} value={s} className="bg-[var(--t-bg2)] text-[var(--t-fg)] text-xs">
                                            {STATUS_LABELS[s]}
                                        </option>
                                    ))}
                                </select>

                                {/* Assignment — only shown when there are ADMIN/SUPPORT users available */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                    {ticket.assigned_to_user_id ? (
                                        <UserCheck className="w-3 h-3 text-green-400 shrink-0" />
                                    ) : (
                                        <UserX className="w-3 h-3 text-[var(--t-fg-dimmed)] shrink-0" />
                                    )}
                                    {agentOptions.length > 0 ? (
                                        <select
                                            value={ticket.assigned_to_user_id ?? ''}
                                            onChange={e => assignMutation.mutate({
                                                id: ticket.id,
                                                assigned_to_user_id: e.target.value || null,
                                            })}
                                            className="text-[10px] bg-transparent text-[var(--t-fg-muted)] outline-none cursor-pointer border-0 min-w-0 truncate max-w-[120px]"
                                            style={{ backgroundImage: 'none' }}
                                            title={getAgentLabel(ticket.assigned_to_user_id) ?? '—'}
                                        >
                                            {agentOptions.map(agent => (
                                                <option key={agent.id} value={agent.id} className="bg-[var(--t-bg2)] text-[var(--t-fg)]">
                                                    {agent.id === me?.id ? '★ Yo' : `${agent.first_name}${agent.last_name ? ' ' + agent.last_name : ''}`}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="text-[10px] text-[var(--t-fg-dimmed)]">
                                            {getAgentLabel(ticket.assigned_to_user_id) ?? '—'}
                                        </span>
                                    )}
                                </div>

                                <Link
                                    to={`/soporte/${ticket.id}`}
                                    className="p-1.5 text-[var(--t-fg-dimmed)] hover:text-[var(--t-accent)] transition-colors"
                                    title="Ver conversación"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
