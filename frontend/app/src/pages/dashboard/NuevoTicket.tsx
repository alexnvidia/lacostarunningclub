import { useNavigate, Link } from 'react-router-dom'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

interface FormFields {
    subject: string
    message: string
    category: string
    priority: string
}

const CATEGORIES = [
    { value: 'general_inquiry', label: 'Consulta general' },
    { value: 'order_issue', label: 'Problema con pedido' },
    { value: 'suggestion', label: 'Sugerencia' },
    { value: 'performance_crew', label: 'Performance / Crew' },
    { value: 'event', label: 'Evento' },
    { value: 'other', label: 'Otro' },
]

const PRIORITIES = [
    { value: 'low', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
]

export default function NuevoTicket() {
    const navigate = useNavigate()
    const qc = useQueryClient()

    const { register, handleSubmit, formState: { errors } } = useForm<FormFields>({
        defaultValues: { priority: 'normal', category: 'general_inquiry' },
    })

    const mutation = useMutation({
        mutationFn: (data: FormFields) =>
            api.post('/api/communication/messages', data).then(r => r.data),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: queryKeys.tickets.list() })
            navigate(`/soporte/${data.id}`)
        },
    })

    const onSubmit: SubmitHandler<FormFields> = (data) => mutation.mutate(data)

    const inputClass = 'w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 outline-none text-sm transition-colors'

    const Field = ({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
            {children}
            {error && <p className="text-[#e63946] text-xs mt-1">{error}</p>}
        </div>
    )

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <Link to="/soporte" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a soporte
            </Link>

            <div className="mb-8">
                <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-2">Ayuda</p>
                <h1 className="text-3xl font-black text-white">Nuevo ticket</h1>
                <p className="text-gray-500 text-sm mt-2">Cuéntanos en qué podemos ayudarte. Te responderemos lo antes posible.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">

                <Field label="Asunto *" id="subject" error={errors.subject?.message}>
                    <input
                        {...register('subject', {
                            required: 'El asunto es obligatorio',
                            maxLength: { value: 200, message: 'Máximo 200 caracteres' },
                        })}
                        id="subject"
                        autoComplete="off"
                        placeholder="Resume el motivo de tu consulta"
                        className={inputClass}
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Categoría" id="category" error={errors.category?.message}>
                        <select {...register('category')} id="category" className={inputClass}>
                            {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Prioridad" id="priority" error={errors.priority?.message}>
                        <select {...register('priority')} id="priority" className={inputClass}>
                            {PRIORITIES.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <Field label="Mensaje *" id="message" error={errors.message?.message}>
                    <textarea
                        {...register('message', { required: 'El mensaje es obligatorio' })}
                        id="message"
                        autoComplete="off"
                        rows={6}
                        placeholder="Describe tu consulta con el mayor detalle posible..."
                        className={`${inputClass} resize-none`}
                    />
                </Field>

                {mutation.isError && (
                    <div className="bg-[#e63946]/10 border border-[#e63946]/20 rounded-lg px-4 py-3">
                        <p className="text-[#e63946] text-sm">Error al enviar el ticket. Inténtalo de nuevo.</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full bg-[#e63946] hover:bg-[#c1121f] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {mutation.isPending
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Send className="w-4 h-4" /> Enviar ticket</>
                    }
                </button>
            </form>
        </div>
    )
}
