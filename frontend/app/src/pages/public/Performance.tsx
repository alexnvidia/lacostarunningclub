import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Map, Upload, Plus, X, Trophy, Lock, Pencil, Trash2, Save, Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkoutData {
    id?: string
    title: string; description: string; workout_type: string
    estimated_duration: number; estimated_distance: number
    difficulty_level: string; warmup?: string; main_set?: string; cooldown?: string
    week_number?: number; year?: number; is_published?: boolean
}

interface PublicResult {
    id: string; user_name: string; race_name: string; race_date: string
    distance: number; time: string; pace: string; location?: string
}

interface WorkoutForm {
    week_number: string
    year: string
    title: string
    description: string
    workout_type: string
    estimated_duration: string
    estimated_distance: string
    difficulty_level: string
    warmup: string
    main_set: string
    cooldown: string
    is_published: boolean
}

// ─── ISO week helpers ────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Returns the Monday of a given ISO week/year as a Date */
function weekStart(week: number, year: number): Date {
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const firstMonday = new Date(jan4)
    firstMonday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1))
    const result = new Date(firstMonday)
    result.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7)
    return result
}

/** Format week label: "Semana 14 · 2025" */
function weekLabel(week: number, year: number): string {
    const start = weekStart(week, year)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    const fmt = (d: Date) => `${d.getUTCDate()} ${d.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`
    return `Sem ${week} · ${fmt(start)} – ${fmt(end)}, ${year}`
}

/** Step week ±1 handling year boundary */
function stepWeek(week: number, year: number, delta: number): { week: number; year: number } {
    // Approximate: most years have 52 weeks, some 53
    const weeksInYear = (new Date(year, 11, 28).getDay() === 4 || new Date(year, 0, 1).getDay() === 4) ? 53 : 52
    let w = week + delta
    let y = year
    if (w < 1) { y -= 1; w = (new Date(y, 11, 28).getDay() === 4 || new Date(y, 0, 1).getDay() === 4) ? 53 : 52 }
    if (w > weeksInYear) { y += 1; w = 1 }
    return { week: w, year: y }
}

const now = new Date()
const EMPTY_FORM: WorkoutForm = {
    week_number: String(getISOWeek(now)),
    year: String(now.getFullYear()),
    title: '',
    description: '',
    workout_type: 'endurance',
    estimated_duration: '',
    estimated_distance: '',
    difficulty_level: 'intermediate',
    warmup: '',
    main_set: '',
    cooldown: '',
    is_published: true,
}

// ─── Shared input styles ─────────────────────────────────────────────────────

const inputCls = 'w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-3 py-2 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors'

// ─── Modal Modes ─────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit'

// ─── Helper: workout → form ───────────────────────────────────────────────────

function workoutToForm(w: WorkoutData): WorkoutForm {
    return {
        week_number: String(w.week_number ?? getISOWeek(new Date())),
        year: String(w.year ?? new Date().getFullYear()),
        title: w.title ?? '',
        description: w.description ?? '',
        workout_type: w.workout_type ?? 'endurance',
        estimated_duration: w.estimated_duration != null ? String(w.estimated_duration) : '',
        estimated_distance: w.estimated_distance != null ? String(w.estimated_distance) : '',
        difficulty_level: w.difficulty_level ?? 'intermediate',
        warmup: w.warmup ?? '',
        main_set: w.main_set ?? '',
        cooldown: w.cooldown ?? '',
        is_published: w.is_published ?? true,
    }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Performance() {
    const { isAuthenticated, user } = useAuthStore()
    const isAdmin = user?.role === 'ADMIN'
    const qc = useQueryClient()

    // ─── Week selector state ───────────────────────────────────────────────
    const currentWeek = getISOWeek(new Date())
    const currentYear = new Date().getFullYear()
    const [selectedWeek, setSelectedWeek] = useState(currentWeek)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const isCurrentWeek = selectedWeek === currentWeek && selectedYear === currentYear

    function navigate(delta: number) {
        const next = stepWeek(selectedWeek, selectedYear, delta)
        setSelectedWeek(next.week)
        setSelectedYear(next.year)
    }

    function goToCurrentWeek() {
        setSelectedWeek(currentWeek)
        setSelectedYear(currentYear)
    }

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<ModalMode>('create')
    const [form, setForm] = useState<WorkoutForm>(EMPTY_FORM)
    const [formError, setFormError] = useState<string | null>(null)

    // ─── Profile & Access ─────────────────────────────────────────────────

    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: queryKeys.user.profile(),
        queryFn: () => api.get<{ subscription?: { status: string } | null }>('/api/users/profile').then(r => r.data),
        enabled: isAuthenticated,
        staleTime: 60 * 60 * 1000, // Cache de 1 hora
    })

    const isSubscribed = profile?.subscription?.status === 'ACTIVE'
    const hasAccess = isAdmin || isSubscribed

    // ─── Queries ──────────────────────────────────────────────────────────

    // Current week workout (for the "default" view and edit/delete reference)
    const { data: currentWorkout, isLoading: loadingCurrentWorkout } = useQuery({
        queryKey: queryKeys.performance.workout(),
        queryFn: () => api.get<WorkoutData>('/api/performance/workouts').then(r => r.data).catch(e => e.response?.status === 404 ? null : Promise.reject(e)),
        staleTime: 60 * 60 * 1000,
    })

    // Historical week workout (only fetches when a different week is selected)
    const { data: historicalWorkout, isLoading: loadingHistorical } = useQuery({
        queryKey: queryKeys.performance.workoutByWeek(selectedWeek, selectedYear),
        queryFn: () =>
            api.get<WorkoutData>(`/api/performance/workouts/${selectedWeek}/${selectedYear}`).then(r => r.data).catch(e => e.response?.status === 404 ? null : Promise.reject(e)),
        enabled: !isCurrentWeek,
        staleTime: 60 * 60 * 1000,
        retry: false,
    })

    // Which workout to actually display
    const workout = isCurrentWeek ? currentWorkout : historicalWorkout
    const loadingWorkout = isCurrentWeek ? loadingCurrentWorkout : loadingHistorical

    const { data: resultsData, isLoading: loadingResults } = useQuery({
        queryKey: queryKeys.performance.resultsPublic(1),
        queryFn: () => api.get<{ results: PublicResult[] }>('/api/performance/results/public?limit=10').then(r => r.data),
        staleTime: 60 * 60 * 1000, // Cache de 1 hora
    })

    const results = resultsData?.results ?? []

    // ─── Mutations ────────────────────────────────────────────────────────

    const createMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) =>
            api.post('/api/performance/workouts', body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['performance', 'workout'] })
            setShowModal(false)
        },
        onError: (err: any) =>
            setFormError(err?.response?.data?.error ?? 'Error al guardar el workout'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
            api.patch(`/api/performance/workouts/${id}`, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['performance', 'workout'] })
            setShowModal(false)
        },
        onError: (err: any) =>
            setFormError(err?.response?.data?.error ?? 'Error al actualizar el workout'),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            api.delete(`/api/performance/workouts/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['performance', 'workout'] })
        },
    })

    const isSaving = createMutation.isPending || updateMutation.isPending

    // ─── Handlers ─────────────────────────────────────────────────────────

    function openCreateModal() {
        setForm({
            ...EMPTY_FORM,
            week_number: String(getISOWeek(new Date())),
            year: String(new Date().getFullYear()),
        })
        setModalMode('create')
        setFormError(null)
        setShowModal(true)
    }

    function openEditModal() {
        if (!currentWorkout) return
        setForm(workoutToForm(currentWorkout))
        setModalMode('edit')
        setFormError(null)
        setShowModal(true)
    }

    function handleDelete() {
        if (!currentWorkout?.id) return
        if (window.confirm(`¿Seguro que quieres eliminar "${currentWorkout.title}"? Esta acción no se puede deshacer.`)) {
            deleteMutation.mutate(currentWorkout.id)
        }
    }

    function handleField(key: keyof WorkoutForm, value: string | boolean) {
        setForm(f => ({ ...f, [key]: value }))
    }

    function buildBody(): Record<string, unknown> {
        return {
            week_number: Number(form.week_number),
            year: Number(form.year),
            title: form.title.trim(),
            description: form.description.trim(),
            workout_type: form.workout_type || undefined,
            difficulty_level: form.difficulty_level || undefined,
            estimated_duration: form.estimated_duration ? Number(form.estimated_duration) : undefined,
            estimated_distance: form.estimated_distance ? Number(form.estimated_distance) : undefined,
            warmup: form.warmup.trim() || undefined,
            main_set: form.main_set.trim() || undefined,
            cooldown: form.cooldown.trim() || undefined,
            is_published: form.is_published,
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setFormError(null)
        if (!form.title.trim() || !form.description.trim()) {
            setFormError('El título y la descripción son obligatorios')
            return
        }
        const body = buildBody()
        if (modalMode === 'edit' && currentWorkout?.id) {
            updateMutation.mutate({ id: currentWorkout.id, body })
        } else {
            createMutation.mutate(body)
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────

    if (isAuthenticated && loadingProfile) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="animate-pulse h-96 bg-[var(--t-bg2)] rounded-3xl" />
            </div>
        )
    }

    if (!hasAccess) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-24 text-center">
                <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-accent)]/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="w-20 h-20 bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                        <Lock className="w-8 h-8 text-[var(--t-accent)]" />
                    </div>
                    <h1 className="text-3xl font-black text-[var(--t-fg)] mb-4 relative z-10">Contenido Exclusivo LCRC</h1>
                    <p className="text-[var(--t-fg-muted)] mb-8 max-w-lg mx-auto leading-relaxed relative z-10">
                        La zona de Performance, los rankings y entrenamientos del club están reservados solo para los miembros con suscripción activa.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                        <a
                            href="https://buymeacoffee.com/lacostarunningclub/membership"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-[#ffffff] font-bold py-3.5 px-8 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[var(--t-accent)]/20"
                        >
                            Suscribirme a LCRC Pass
                        </a>
                        {!isAuthenticated && (
                            <Link
                                to="/login"
                                className="w-full sm:w-auto bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-[var(--t-accent)] text-[var(--t-fg)] font-semibold py-3.5 px-8 rounded-xl transition-colors"
                            >
                                Ya soy miembro
                            </Link>
                        )}
                    </div>
                    <p className="mt-8 text-sm text-[var(--t-fg-dimmed)] relative z-10">
                        ¿Prefieres hacerlo en persona? Contacta con el staff de La Costa para formalizar tu inscripción y pago en nuestros eventos.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-10">
                <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-2">Performance Crew</p>
                <h1 className="text-4xl font-black text-[var(--t-fg)]">Entrena con el club</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Workout column */}
                <div className="lg:col-span-2">
                    <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                        <h2 className="text-xl font-bold text-[var(--t-fg)]">Workout de la semana</h2>

                        {/* Admin actions — only visible to ADMIN and only for the current week */}
                        {isAdmin && isCurrentWeek && (
                            <div className="flex items-center gap-2">
                                {/* Edit & Delete — only when a workout exists */}
                                {currentWorkout && (
                                    <>
                                        <button
                                            id="btn-edit-workout"
                                            onClick={openEditModal}
                                            disabled={deleteMutation.isPending}
                                            className="flex items-center gap-1.5 text-xs bg-[var(--t-bg2)] hover:bg-[var(--t-border)] border border-[var(--t-border)] text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg)] px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
                                            title="Editar workout"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Editar
                                        </button>
                                        <button
                                            id="btn-delete-workout"
                                            onClick={handleDelete}
                                            disabled={deleteMutation.isPending}
                                            className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
                                            title="Eliminar workout"
                                        >
                                            {deleteMutation.isPending
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />
                                            }
                                            Eliminar
                                        </button>
                                    </>
                                )}
                                <button
                                    id="btn-new-workout"
                                    onClick={openCreateModal}
                                    className="flex items-center gap-1.5 text-xs bg-[var(--t-accent)]/10 hover:bg-[var(--t-accent)]/20 border border-[var(--t-accent)]/30 text-[var(--t-accent)] px-3 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Nuevo workout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Week navigator ───────────────────────────────────── */}
                    <div className="flex items-center justify-between bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl px-3 py-2 mb-4">
                        <button
                            id="btn-prev-week"
                            onClick={() => navigate(-1)}
                            className="p-1.5 rounded-lg text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg)] hover:bg-[var(--t-border)] transition-all"
                            title="Semana anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 text-sm">
                            <CalendarDays className="w-4 h-4 text-[var(--t-accent)]" />
                            <span className="font-medium text-[var(--t-fg)]">{weekLabel(selectedWeek, selectedYear)}</span>
                            {isCurrentWeek && (
                                <span className="text-[10px] bg-[var(--t-accent)]/15 text-[var(--t-accent)] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">Actual</span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            {!isCurrentWeek && (
                                <button
                                    id="btn-goto-current-week"
                                    onClick={goToCurrentWeek}
                                    className="text-xs text-[var(--t-accent)] hover:underline px-2 py-1 transition-colors"
                                >
                                    Hoy
                                </button>
                            )}
                            <button
                                id="btn-next-week"
                                onClick={() => navigate(1)}
                                disabled={isCurrentWeek}
                                className="p-1.5 rounded-lg text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg)] hover:bg-[var(--t-border)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Semana siguiente"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {loadingWorkout ? (
                        <div className="bg-[var(--t-bg2)] rounded-2xl h-64 animate-pulse" />
                    ) : workout ? (
                        <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4 text-sm text-[var(--t-fg-muted)]">
                                <span className="bg-[var(--t-accent)]/10 text-[var(--t-accent)] px-3 py-1 rounded-full capitalize">{workout.workout_type}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{workout.estimated_duration} min</span>
                                <span className="flex items-center gap-1"><Map className="w-3.5 h-3.5" />{workout.estimated_distance} km</span>
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--t-fg)] mb-3">{workout.title}</h3>
                            <p className="text-[var(--t-fg-muted)] leading-relaxed mb-6">{workout.description}</p>
                            {(workout.warmup || workout.main_set || workout.cooldown) && (
                                <div className="space-y-3 border-t border-[var(--t-border)] pt-5">
                                    {workout.warmup && (
                                        <div>
                                            <p className="text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider mb-1">Calentamiento</p>
                                            <p className="text-[var(--t-fg)] text-sm">{workout.warmup}</p>
                                        </div>
                                    )}
                                    {workout.main_set && (
                                        <div>
                                            <p className="text-xs text-[var(--t-accent)] uppercase tracking-wider mb-1">Parte principal</p>
                                            <p className="text-[var(--t-fg)] text-sm">{workout.main_set}</p>
                                        </div>
                                    )}
                                    {workout.cooldown && (
                                        <div>
                                            <p className="text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider mb-1">Vuelta a la calma</p>
                                            <p className="text-[var(--t-fg)] text-sm">{workout.cooldown}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-8 text-center text-[var(--t-fg-dimmed)]">
                            No hay workout publicado esta semana
                        </div>
                    )}

                    {/* CTA to upload result & My Races */}
                    {isAuthenticated ? (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Link to="/mis-carreras" className="flex items-center justify-center gap-2 bg-[var(--t-bg2)] hover:bg-[#2a2a2a] border border-[var(--t-border)] text-[var(--t-fg)] py-3 rounded-xl font-medium text-sm transition-colors">
                                <Trophy className="w-4 h-4 text-[var(--t-accent2)]" /> Mis Carreras
                            </Link>
                            <Link to="/subir-resultado" className="flex items-center justify-center gap-2 bg-[var(--t-accent)]/10 hover:bg-[var(--t-accent)]/20 border border-[var(--t-accent)]/20 text-[var(--t-accent)] py-3 rounded-xl font-medium text-sm transition-colors">
                                <Upload className="w-4 h-4" /> Subir mi resultado
                            </Link>
                        </div>
                    ) : (
                        <Link to="/registro" className="mt-4 flex items-center justify-center gap-2 bg-[var(--t-bg2)] hover:bg-[#2a2a2a] border border-[var(--t-border)] text-[var(--t-fg)] py-3 rounded-xl text-sm transition-colors">
                            Únete para subir tus resultados
                        </Link>
                    )}
                </div>

                {/* Results feed */}
                <div>
                    <h2 className="text-xl font-bold text-[var(--t-fg)] mb-4">Últimos resultados</h2>
                    {loadingResults ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-[var(--t-bg2)] rounded-xl h-16 animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {results.map((r) => (
                                <div key={r.id} className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-[var(--t-fg)] text-sm">{r.user_name}</p>
                                            <p className="text-[var(--t-fg-dimmed)] text-xs">{r.race_name || 'Entrenamiento'} · {formatDate(r.race_date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[var(--t-accent)] font-bold">{r.distance}km</p>
                                            {r.time && <p className="text-[var(--t-fg-muted)] text-xs">{r.time}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Admin: Modal to create/update workout ──────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />

                    {/* Panel */}
                    <div className="relative bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--t-border)] sticky top-0 bg-[var(--t-bg2)] z-10">
                            <h2 className="text-[var(--t-fg)] font-bold text-lg">
                                {modalMode === 'edit' ? 'Editar workout' : 'Nuevo workout de la semana'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-[var(--t-fg-dimmed)] hover:text-[var(--t-fg)] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">

                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                                    {formError}
                                </div>
                            )}

                            {/* Week / Year */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">ISO Week *</label>
                                    <input
                                        id="field-week"
                                        type="number" min="1" max="53"
                                        value={form.week_number}
                                        onChange={e => handleField('week_number', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Año *</label>
                                    <input
                                        id="field-year"
                                        type="number" min="2025"
                                        value={form.year}
                                        onChange={e => handleField('year', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Title *</label>
                                <input
                                    id="field-title"
                                    value={form.title}
                                    onChange={e => handleField('title', e.target.value)}
                                    placeholder="Rodaje de fondo progresivo"
                                    className={inputCls}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Description *</label>
                                <textarea
                                    id="field-description"
                                    rows={3}
                                    value={form.description}
                                    onChange={e => handleField('description', e.target.value)}
                                    placeholder="Descripción general del entrenamiento..."
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            {/* Type / Difficulty / Duration / Distance */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Type</label>
                                    <select id="field-type" value={form.workout_type} onChange={e => handleField('workout_type', e.target.value)} className={inputCls}>
                                        <option value="technique">Técnica</option>
                                        <option value="speed">Velocidad</option>
                                        <option value="endurance">Fondo</option>
                                        <option value="recovery">Recuperación</option>
                                        <option value="strength">Fuerza</option>
                                        <option value="mixed">Mixto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Dificultad</label>
                                    <select id="field-difficulty" value={form.difficulty_level} onChange={e => handleField('difficulty_level', e.target.value)} className={inputCls}>
                                        <option value="beginner">Principiante</option>
                                        <option value="intermediate">Intermedio</option>
                                        <option value="advanced">Avanzado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Duración estimada (min)</label>
                                    <input
                                        id="field-duration"
                                        type="number" min="0"
                                        value={form.estimated_duration}
                                        onChange={e => handleField('estimated_duration', e.target.value)}
                                        placeholder="60"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Distancia estimada (km)</label>
                                    <input
                                        id="field-distance"
                                        type="number" min="0" step="0.1"
                                        value={form.estimated_distance}
                                        onChange={e => handleField('estimated_distance', e.target.value)}
                                        placeholder="10"
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* Warmup */}
                            <div>
                                <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Warmup</label>
                                <textarea
                                    id="field-warmup"
                                    rows={2}
                                    value={form.warmup}
                                    onChange={e => handleField('warmup', e.target.value)}
                                    placeholder="10 min trote suave + movilidad articular"
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            {/* Main set */}
                            <div>
                                <label className="block text-xs text-[var(--t-accent)] mb-1.5 font-medium uppercase tracking-wider">Main set</label>
                                <textarea
                                    id="field-main-set"
                                    rows={3}
                                    value={form.main_set}
                                    onChange={e => handleField('main_set', e.target.value)}
                                    placeholder="5 × 1000m al ritmo de 10K con 90s de recuperación"
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            {/* Cooldown */}
                            <div>
                                <label className="block text-xs text-[var(--t-fg-muted)] mb-1.5 font-medium">Cooldown</label>
                                <textarea
                                    id="field-cooldown"
                                    rows={2}
                                    value={form.cooldown}
                                    onChange={e => handleField('cooldown', e.target.value)}
                                    placeholder="10 min trote regenerativo + estiramientos"
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            {/* Publicar */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    id="field-published"
                                    type="checkbox"
                                    checked={form.is_published}
                                    onChange={e => handleField('is_published', e.target.checked)}
                                    className="w-4 h-4 accent-[#e63946]"
                                />
                                <span className="text-sm text-[var(--t-fg)]">Publicar inmediatamente</span>
                            </label>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--t-border)] mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    id="btn-save-workout"
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-50 text-[var(--t-fg)] text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                                >
                                    {isSaving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                    ) : modalMode === 'edit' ? (
                                        <><Save className="w-4 h-4" /> Guardar cambios</>
                                    ) : (
                                        <><Plus className="w-4 h-4" /> Guardar workout</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
