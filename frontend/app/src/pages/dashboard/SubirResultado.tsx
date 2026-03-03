import { useNavigate } from 'react-router-dom'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

// Form uses strings to avoid zodResolver coerce issues; convert on submit
interface FormFields {
    race_date: string
    distance_km: string
    duration_min: string
    race_name: string
    location: string
    surface_type: string
    time: string
    pace: string
    avg_heart_rate: string
    elevation_gain: string
    is_public: boolean
}

export default function SubirResultado() {
    const navigate = useNavigate()
    const qc = useQueryClient()

    const { register, handleSubmit, formState: { errors } } = useForm<FormFields>({
        defaultValues: { is_public: true },
    })

    const mutation = useMutation({
        mutationFn: (data: FormFields) => {
            const payload = {
                race_date: data.race_date,
                distance_km: parseFloat(data.distance_km),
                duration_min: parseFloat(data.duration_min),
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

    const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
            {children}
            {error && <p className="text-[#e63946] text-xs mt-1">{error}</p>}
        </div>
    )

    const inputClass = "w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 outline-none text-sm transition-colors"

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <button onClick={() => navigate('/mis-carreras')} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <div className="mb-8">
                <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-2">Performance</p>
                <h1 className="text-3xl font-black text-white">Subir resultado</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
                {/* Required */}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Fecha *" error={errors.race_date?.message}>
                        <input {...register('race_date', { required: 'Requerido' })} type="date" className={inputClass} />
                    </Field>
                    <Field label="Distancia (km) *" error={errors.distance_km?.message}>
                        <input {...register('distance_km', { required: 'Requerido', min: { value: 0.1, message: 'Debe ser positivo' } })} type="number" step="0.01" placeholder="10.5" className={inputClass} />
                    </Field>
                </div>

                <Field label="Duración (minutos) *" error={errors.duration_min?.message}>
                    <input {...register('duration_min', { required: 'Requerido', min: { value: 1, message: 'Debe ser positivo' } })} type="number" step="0.5" placeholder="45" className={inputClass} />
                </Field>

                {/* Optional */}
                <div className="border-t border-[#2a2a2a] pt-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Datos opcionales</p>
                    <div className="space-y-4">
                        <Field label="Nombre de la carrera">
                            <input {...register('race_name')} placeholder="p.ej. Carrera Popular Fuengirola" className={inputClass} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Tiempo oficial (hh:mm:ss)">
                                <input {...register('time')} placeholder="0:45:30" className={inputClass} />
                            </Field>
                            <Field label="Ritmo (min/km)">
                                <input {...register('pace')} placeholder="4:33" className={inputClass} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Ubicación">
                                <input {...register('location')} placeholder="Fuengirola" className={inputClass} />
                            </Field>
                            <Field label="Superficie">
                                <select {...register('surface_type')} className={inputClass}>
                                    <option value="">Seleccionar</option>
                                    <option value="road">Asfalto</option>
                                    <option value="trail">Trail</option>
                                    <option value="track">Pista</option>
                                    <option value="treadmill">Cinta</option>
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="FC media (ppm)">
                                <input {...register('avg_heart_rate')} type="number" placeholder="155" className={inputClass} />
                            </Field>
                            <Field label="Desnivel (m)">
                                <input {...register('elevation_gain')} type="number" placeholder="120" className={inputClass} />
                            </Field>
                        </div>
                    </div>
                </div>

                {/* Public toggle */}
                <div className="flex items-center justify-between bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-3">
                    <div>
                        <p className="text-white text-sm font-medium">Resultado público</p>
                        <p className="text-gray-500 text-xs">Visible en el feed del club</p>
                    </div>
                    <input {...register('is_public')} type="checkbox" className="w-5 h-5 accent-[#e63946]" />
                </div>

                {mutation.error && (
                    <div className="bg-[#e63946]/10 border border-[#e63946]/20 rounded-lg px-4 py-3">
                        <p className="text-[#e63946] text-sm">Error al subir el resultado. Inténtalo de nuevo.</p>
                    </div>
                )}

                <button type="submit" disabled={mutation.isPending} className="w-full bg-[#e63946] hover:bg-[#c1121f] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Subir resultado'}
                </button>
            </form>
        </div>
    )
}
