import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users, ArrowLeft, Search } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDateTime } from '@/lib/utils'

interface User {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
    active: boolean
    created_at: string
    total_orders: number
    total_spent: number
}

interface UsersResponse {
    users: User[]
    pagination: { page: number; limit: number; total: number; total_pages: number }
}

function useDebounce(fn: (v: string) => void, delay: number) {
    let timer: ReturnType<typeof setTimeout>
    return useCallback((value: string) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(value), delay)
    }, [fn, delay]) // eslint-disable-line react-hooks/exhaustive-deps
}

export default function AdminUsuarios() {
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [page, setPage] = useState(1)

    const onSearchDebounced = useDebounce((v: string) => {
        setDebouncedSearch(v)
        setPage(1)
    }, 400)

    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (roleFilter) params.set('role', roleFilter)

    const { data, isLoading } = useQuery<UsersResponse>({
        queryKey: queryKeys.admin.users(debouncedSearch || undefined, roleFilter || undefined, page),
        queryFn: () => api.get(`/api/admin/users?${params}`).then(r => r.data),
    })

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <Link to="/admin" className="flex items-center gap-1 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Panel Admin
            </Link>

            <div className="flex flex-wrap items-end gap-4 mb-6">
                <div>
                    <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-1">Admin</p>
                    <h1 className="text-3xl font-black text-[var(--t-fg)] flex items-center gap-2">
                        <Users className="w-7 h-7" /> Usuarios
                    </h1>
                </div>
                <div className="ml-auto flex gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-fg-dimmed)] pointer-events-none" />
                        <input
                            id="user-search"
                            type="search"
                            autoComplete="off"
                            placeholder="Buscar por nombre o email..."
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value)
                                onSearchDebounced(e.target.value)
                            }}
                            className="bg-[var(--t-bg2)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg pl-9 pr-4 py-2 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors w-64"
                        />
                    </div>
                    {/* Role filter */}
                    <select
                        id="role-filter"
                        value={roleFilter}
                        onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
                        className="bg-[var(--t-bg2)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2 text-[var(--t-fg)] outline-none text-sm transition-colors"
                    >
                        <option value="">Todos los roles</option>
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[var(--t-border)] text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider">
                    <span>Usuario</span><span>Email</span><span>Rol</span><span>Pedidos / Gasto</span><span>Registro</span>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-[#2a2a2a] rounded animate-pulse" />)}
                    </div>
                ) : (data?.users ?? []).length === 0 ? (
                    <p className="text-center py-16 text-[var(--t-fg-dimmed)]">Sin resultados</p>
                ) : (
                    <div className="divide-y divide-[var(--t-border)]">
                        {data!.users.map(user => (
                            <div key={user.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4">
                                <div>
                                    <p className="text-[var(--t-fg)] text-sm font-medium">{user.first_name} {user.last_name}</p>
                                    <p className={`text-[10px] mt-0.5 ${user.active ? 'text-green-400' : 'text-red-400'}`}>
                                        {user.active ? 'Activo' : 'Inactivo'}
                                    </p>
                                </div>
                                <p className="text-[var(--t-fg-muted)] text-sm truncate">{user.email}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${user.role === 'ADMIN'
                                        ? 'bg-[var(--t-accent)]/10 text-[var(--t-accent)]'
                                        : 'bg-gray-500/10 text-[var(--t-fg-muted)]'
                                    }`}>
                                    {user.role}
                                </span>
                                <div>
                                    <p className="text-[var(--t-fg)] text-sm">{user.total_orders} pedidos</p>
                                    <p className="text-[var(--t-fg-dimmed)] text-xs">{user.total_spent.toFixed(2)} €</p>
                                </div>
                                <p className="text-[var(--t-fg-dimmed)] text-xs">{formatDateTime(user.created_at)}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {data && data.pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--t-border)]">
                        <p className="text-xs text-[var(--t-fg-dimmed)]">{data.pagination.total} usuarios</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-[var(--t-fg-muted)] rounded-lg text-xs disabled:opacity-40">Anterior</button>
                            <span className="px-3 py-1.5 text-xs text-[var(--t-fg-muted)]">{page} / {data.pagination.total_pages}</span>
                            <button onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))} disabled={page === data.pagination.total_pages}
                                className="px-3 py-1.5 bg-[#2a2a2a] text-[var(--t-fg-muted)] rounded-lg text-xs disabled:opacity-40">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
