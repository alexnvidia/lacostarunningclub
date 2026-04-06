import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Trophy, Upload, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

interface MyResult {
    id: string; race_name: string; race_date: string
    distance: number; time: string; pace: string
    location?: string; surface_type?: string; is_public: boolean
    notes?: string; elevation_gain?: number
}

interface EditForm {
    race_name: string
    race_date: string
    distance: string
    time: string
    pace: string
    location: string
    surface_type: string
    notes: string
    is_public: boolean
}

const SURFACES = ['road', 'trail', 'track', 'mixed']

export default function MyRaces() {
    const queryClient = useQueryClient()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<EditForm | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.performance.resultsMine(),
        queryFn: () => api.get<{ results: MyResult[] }>('/api/performance/results').then(r => r.data),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<EditForm> }) =>
            api.patch(`/api/performance/results/${id}`, payload).then(r => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.performance.resultsMine() })
            setEditingId(null)
            setEditForm(null)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            api.delete(`/api/performance/results/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.performance.resultsMine() })
        },
    })

    const results = data?.results ?? []

    const openEdit = (r: MyResult) => {
        setEditingId(r.id)
        setEditForm({
            race_name: r.race_name ?? '',
            race_date: r.race_date ?? '',
            distance: String(r.distance ?? ''),
            time: r.time ?? '',
            pace: r.pace ?? '',
            location: r.location ?? '',
            surface_type: r.surface_type ?? '',
            notes: r.notes ?? '',
            is_public: r.is_public ?? true,
        })
    }

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar "${name || 'este resultado'}"? Esta acción no se puede deshacer.`)) {
            deleteMutation.mutate(id)
        }
    }

    const handleSave = () => {
        if (!editingId || !editForm) return
        const payload: any = {
            race_name: editForm.race_name || undefined,
            race_date: editForm.race_date || undefined,
            distance: editForm.distance ? Number(editForm.distance) : undefined,
            time: editForm.time || undefined,
            pace: editForm.pace || undefined,
            location: editForm.location || undefined,
            surface_type: editForm.surface_type || undefined,
            notes: editForm.notes || undefined,
            is_public: editForm.is_public,
        }
        updateMutation.mutate({ id: editingId, payload })
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-2">Mi historial</p>
                    <h1 className="text-3xl font-black text-[var(--t-fg)]">Mis Carreras</h1>
                </div>
                <Link to="/subir-resultado" className="flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[var(--t-fg)] font-semibold px-4 py-2.5 rounded-lg text-sm transition-all">
                    <Upload className="w-4 h-4" /> Subir resultado
                </Link>
            </div>

            {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-[var(--t-bg2)] rounded-xl h-20 animate-pulse" />)}</div>
            ) : results.length === 0 ? (
                <div className="text-center py-20">
                    <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-[var(--t-fg-dimmed)] mb-4">Aún no has subido ningún resultado</p>
                    <Link to="/subir-resultado" className="text-[var(--t-accent)] hover:underline">Subir tu primer resultado →</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {results.map((r) => (
                        <div key={r.id} className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl overflow-hidden transition-all">

                            {/* ── Result Row ── */}
                            <div className="flex items-center justify-between p-5">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-[var(--t-fg)] truncate">{r.race_name || 'Entrenamiento'}</p>
                                        {r.is_public && <span className="text-[10px] bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded-full shrink-0">Público</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[var(--t-fg-dimmed)]">
                                        <span>{formatDate(r.race_date)}</span>
                                        {r.location && <span>· {r.location}</span>}
                                        {r.surface_type && <span>· {r.surface_type}</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 ml-4 shrink-0">
                                    {/* Stats */}
                                    <div className="text-right">
                                        <p className="text-[var(--t-accent)] font-bold text-lg">{r.distance}km</p>
                                        {r.time && <p className="text-[var(--t-fg)] text-sm">{r.time}</p>}
                                        {r.pace && <p className="text-[var(--t-fg-dimmed)] text-xs">{r.pace}/km</p>}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <button
                                            id={`edit-result-${r.id}`}
                                            onClick={() => editingId === r.id ? (setEditingId(null), setEditForm(null)) : openEdit(r)}
                                            className="p-2 rounded-lg text-[var(--t-fg-dimmed)] hover:text-[var(--t-accent)] hover:bg-[var(--t-accent)]/10 transition-all"
                                            title="Editar resultado"
                                        >
                                            {editingId === r.id ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                        </button>
                                        <button
                                            id={`delete-result-${r.id}`}
                                            onClick={() => handleDelete(r.id, r.race_name)}
                                            disabled={deleteMutation.isPending && deleteMutation.variables === r.id}
                                            className="p-2 rounded-lg text-[var(--t-fg-dimmed)] hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40"
                                            title="Eliminar resultado"
                                        >
                                            {deleteMutation.isPending && deleteMutation.variables === r.id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Trash2 className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Inline Edit Panel ── */}
                            {editingId === r.id && editForm && (
                                <div className="border-t border-[var(--t-border)] bg-[var(--t-bg)] px-5 py-4">
                                    <p className="text-xs font-semibold text-[var(--t-accent)] uppercase tracking-wider mb-4">Editar resultado</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="col-span-2 sm:col-span-3">
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Nombre de la carrera</label>
                                            <input
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors"
                                                value={editForm.race_name}
                                                onChange={e => setEditForm(f => f ? { ...f, race_name: e.target.value } : f)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Fecha</label>
                                            <input
                                                type="date"
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors"
                                                value={editForm.race_date}
                                                onChange={e => setEditForm(f => f ? { ...f, race_date: e.target.value } : f)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Distancia (km)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors"
                                                value={editForm.distance}
                                                onChange={e => setEditForm(f => f ? { ...f, distance: e.target.value } : f)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Tiempo (HH:MM:SS)</label>
                                            <input
                                                placeholder="01:30:00"
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors"
                                                value={editForm.time}
                                                onChange={e => setEditForm(f => f ? { ...f, time: e.target.value } : f)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Ritmo (min/km)</label>
                                            <input
                                                placeholder="5:30"
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors"
                                                value={editForm.pace}
                                                onChange={e => setEditForm(f => f ? { ...f, pace: e.target.value } : f)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Ubicación</label>
                                            <input
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors"
                                                value={editForm.location}
                                                onChange={e => setEditForm(f => f ? { ...f, location: e.target.value } : f)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Superficie</label>
                                            <select
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors"
                                                value={editForm.surface_type}
                                                onChange={e => setEditForm(f => f ? { ...f, surface_type: e.target.value } : f)}
                                            >
                                                <option value="">— Sin especificar —</option>
                                                {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-2 sm:col-span-3">
                                            <label className="block text-xs text-[var(--t-fg-dimmed)] mb-1">Notas</label>
                                            <textarea
                                                rows={2}
                                                className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm text-[var(--t-fg)] focus:outline-none focus:border-[var(--t-accent)] transition-colors resize-none"
                                                value={editForm.notes}
                                                onChange={e => setEditForm(f => f ? { ...f, notes: e.target.value } : f)}
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-3 flex items-center gap-2">
                                            <input
                                                id={`is-public-${r.id}`}
                                                type="checkbox"
                                                className="w-4 h-4 accent-[var(--t-accent)]"
                                                checked={editForm.is_public}
                                                onChange={e => setEditForm(f => f ? { ...f, is_public: e.target.checked } : f)}
                                            />
                                            <label htmlFor={`is-public-${r.id}`} className="text-sm text-[var(--t-fg-dimmed)]">Resultado público</label>
                                        </div>
                                    </div>

                                    {/* Error message */}
                                    {updateMutation.isError && (
                                        <p className="mt-3 text-xs text-red-400">Error al guardar. Inténtalo de nuevo.</p>
                                    )}

                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            onClick={() => { setEditingId(null); setEditForm(null) }}
                                            className="px-4 py-2 text-sm rounded-lg border border-[var(--t-border)] text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg)] transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            id={`save-result-${r.id}`}
                                            onClick={handleSave}
                                            disabled={updateMutation.isPending}
                                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[var(--t-fg)] font-semibold transition-all disabled:opacity-60"
                                        >
                                            {updateMutation.isPending
                                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                                : <><Save className="w-4 h-4" /> Guardar cambios</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
