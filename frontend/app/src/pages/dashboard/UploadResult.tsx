import { useNavigate } from 'react-router-dom'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

// Form uses strings to avoid zodResolver coerce issues; convert on submit
interface FormFields {
    race_date: string
    distance: string
    race_name: string
    location: string
    surface_type: string
    time: string
    pace: string
    avg_heart_rate: string
    elevation_gain: string
    is_public: boolean
}

export default function UploadResult() {
    const navigate = useNavigate()
    const qc = useQueryClient()

    const { register, handleSubmit, formState: { errors } } = useForm<FormFields>({
        defaultValues: { is_public: true },
    })

    const mutation = useMutation({
        mutationFn: (data: FormFields) => {
            const payload = {
                race_date: data.race_date,
                distance: parseFloat(data.distance),
                race_name: data.race_name || undefined,
                location: data.location || undefined,
                surface_type: data.surface_type || undefined,
                time: data.time || undefined,
                pace: data.pace || undefined,
                avg_heart_rate: data.avg_heart_rate ? parseFloat(data.avg_heart_rate) : undefined,
                elevation_gain: data.elevation_gain ? parseFloat(data.elevation_gain) : undefined,
                is_public: data.is_public,
            }
            return api.post('/api/performance/results', payload).then(r => r.data)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.performance.resultsMine() })
            qc.invalidateQueries({ queryKey: queryKeys.performance.resultsPublic(1) })
            navigate('/mis-carreras')
        },
    })

    const onSubmit: SubmitHandler<FormFields> = (data) => mutation.mutate(data)

    const Field = ({ label, id, error, children }: { label: string; id?: string; error?: string; children: React.ReactNode }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-[var(--t-fg)] mb-1.5">{label}</label>
            {children}
            {error && <p className="text-[var(--t-accent)] text-xs mt-1">{error}</p>}
        </div>
    )

    const inputClass = "w-full bg-[var(--t-bg)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg px-4 py-2.5 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors"

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <button onClick={() => navigate('/mis-carreras')} className="flex items-center gap-1 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <div className="mb-8">
                <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-2">Performance</p>
                <h1 className="text-3xl font-black text-[var(--t-fg)]">Subir resultado</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl p-6 space-y-5">
                {/* Required */}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Fecha *" id="race_date" error={errors.race_date?.message}>
                        <input {...register('race_date', { required: 'Requerido' })} id="race_date" type="date" className={inputClass} />
                    </Field>
                    <Field label="Distancia (km) *" id="distance" error={errors.distance?.message}>
                        <input {...register('distance', { required: 'Requerido', min: { value: 0.1, message: 'Debe ser positivo' } })} id="distance" type="number" step="0.01" placeholder="10.5" className={inputClass} />
                    </Field>
                </div>

                {/* Optional */}
                <div className="border-t border-[var(--t-border)] pt-5">
                    <p className="text-xs text-[var(--t-fg-dimmed)] uppercase tracking-wider mb-4">Datos opcionales</p>
                    <div className="space-y-4">
                        <Field label="Nombre de la carrera" id="race_name">
                            <input {...register('race_name')} id="race_name" placeholder="p.ej. Carrera Popular Fuengirola" className={inputClass} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Tiempo oficial (hh:mm:ss)" id="time">
                                <input {...register('time')} id="time" placeholder="0:45:30" className={inputClass} />
                            </Field>
                            <Field label="Ritmo (min/km)" id="pace">
                                <input {...register('pace')} id="pace" placeholder="4:33" className={inputClass} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Ubicación" id="location">
                                <input {...register('location')} id="location" placeholder="Fuengirola" className={inputClass} />
                            </Field>
                            <Field label="Superficie" id="surface_type">
                                <select {...register('surface_type')} id="surface_type" className={inputClass}>
                                    <option value="">Seleccionar</option>
                                    <option value="road">Asfalto</option>
                                    <option value="trail">Trail</option>
                                    <option value="track">Pista</option>
                                    <option value="treadmill">Cinta</option>
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="FC media (ppm)" id="avg_heart_rate">
                                <input {...register('avg_heart_rate')} id="avg_heart_rate" type="number" placeholder="155" className={inputClass} />
                            </Field>
                            <Field label="Desnivel (m)" id="elevation_gain">
                                <input {...register('elevation_gain')} id="elevation_gain" type="number" placeholder="120" className={inputClass} />
                            </Field>
                        </div>
                    </div>
                </div>

                {/* Public toggle */}
                <div className="flex items-center justify-between bg-[var(--t-bg)] border border-[var(--t-border)] rounded-lg px-4 py-3">
                    <div>
                        <p className="text-[var(--t-fg)] text-sm font-medium">Resultado público</p>
                        <p className="text-[var(--t-fg-dimmed)] text-xs">Visible en el feed del club</p>
                    </div>
                    <input {...register('is_public')} id="is_public" type="checkbox" className="w-5 h-5 accent-[#e63946]" />
                </div>

                {mutation.error && (
                    <div className="bg-[var(--t-accent)]/10 border border-[var(--t-accent)]/20 rounded-lg px-4 py-3">
                        <p className="text-[var(--t-accent)] text-sm">Error al subir el resultado. Inténtalo de nuevo.</p>
                    </div>
                )}

                <button type="submit" disabled={mutation.isPending} className="w-full bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-50 text-[var(--t-fg)] font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Subir resultado'}
                </button>
            </form>
        </div>
    )
}
