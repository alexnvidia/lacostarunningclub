import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowRight, Zap, Trophy, Users, ShoppingBag, ChevronRight, ChevronLeft, MapPin, Timer } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

// Carousel assets
import slide1 from '@/assets/carousel/people.jpg'
import slide2 from '@/assets/carousel/staff.jpg'
import slide3 from '@/assets/carousel/paseo.jpg'
import runnerWebm from '@/assets/carousel/runner.webm'
import locFuengirola from '@/assets/carousel/loc-fuengirola.webp'
import locTorreon from '@/assets/carousel/loc-torreon.jpg'

const SLIDES = [
    { src: slide1, alt: 'Forma parte de la comunidad', caption: 'Forma parte de la comunidad' },
    { src: slide2, alt: 'Calentamientos en grupo', caption: 'Calentamientos en grupo' },
    { src: slide3, alt: 'Ruta por el paseo marítimo', caption: 'Rutas por el paseo marítimo' },
]

// Runner video speed constants (mirrored from reference scripts.js)
const SPEED_NORMAL = 0.7
const SPEED_SLOW = 0.3

interface WorkoutData {
    title: string
    description: string
    workout_type: string
    estimated_duration: number
    estimated_distance: number
    difficulty_level: string
}

interface PublicResult {
    id: string
    user_name: string
    race_name: string
    race_date: string
    distance: number
    time: string
    pace: string
}

/* ─── Image Carousel ─── */
function ImageCarousel() {
    const [current, setCurrent] = useState(0)
    const vidRef = useRef<HTMLVideoElement>(null)

    const next = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), [])
    const prev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), [])

    // Auto-advance every 5s, pause on hover (mirrors reference scripts.js)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(next, 5000)
    }, [next])
    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current)
    }, [])

    useEffect(() => {
        startTimer()
        return () => stopTimer()
    }, [startTimer, stopTimer])

    // Set initial playback rate once video is ready
    const handleVideoLoad = () => {
        if (vidRef.current) vidRef.current.playbackRate = SPEED_NORMAL
    }

    // Slow down runner video on hover, speed up when leaving
    const handleMouseEnter = () => {
        stopTimer()
        if (vidRef.current) vidRef.current.playbackRate = SPEED_SLOW
    }
    const handleMouseLeave = () => {
        startTimer()
        if (vidRef.current) vidRef.current.playbackRate = SPEED_NORMAL
    }

    return (
        <section
            aria-label="Carrusel de fotos"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
            style={{
                position: 'relative',
                width: '100%',
                overflow: 'hidden',
                maxHeight: '70vh',
                minHeight: '340px',
                background: '#0d0d0d',
            }}
        >
            {/* Track */}
            <div
                style={{
                    display: 'flex',
                    width: `${SLIDES.length * 100}%`,
                    transform: `translateX(-${(current * 100) / SLIDES.length}%)`,
                    transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
                    height: '100%',
                }}
            >
                {SLIDES.map((slide, i) => (
                    <div
                        key={i}
                        style={{ width: `${100 / SLIDES.length}%`, position: 'relative', flexShrink: 0 }}
                    >
                        <img
                            src={slide.src}
                            alt={slide.alt}
                            style={{
                                width: '100%',
                                height: '70vh',
                                minHeight: '340px',
                                objectFit: 'cover',
                                objectPosition: 'center',
                                display: 'block',
                                filter: 'brightness(0.65)',
                            }}
                        />
                        {/* Gradient caption */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 'auto 0 0 0',
                                padding: '14px 16px',
                                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.55) 40%, rgba(0,0,0,.7))',
                                fontSize: '14px',
                                color: '#e5e7eb',
                                fontWeight: 600,
                            }}
                        >
                            {slide.caption}
                        </div>
                    </div>
                ))}
            </div>

            {/* Prev button */}
            <button
                onClick={() => { prev(); startTimer() }}
                aria-label="Anterior"
                style={{
                    position: 'absolute', top: '50%', left: '6px', transform: 'translateY(-50%)',
                    width: 42, height: 42, borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(15,23,42,0.55)',
                    color: '#fff', display: 'grid', placeItems: 'center',
                    backdropFilter: 'blur(6px)',
                    cursor: 'pointer', zIndex: 2,
                    padding: 0,
                }}
            >
                <ChevronLeft size={20} />
            </button>

            {/* Next button */}
            <button
                onClick={() => { next(); startTimer() }}
                aria-label="Siguiente"
                style={{
                    position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)',
                    width: 42, height: 42, borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(15,23,42,0.55)',
                    color: '#fff', display: 'grid', placeItems: 'center',
                    backdropFilter: 'blur(6px)',
                    cursor: 'pointer', zIndex: 2,
                    padding: 0,
                }}
            >
                <ChevronRight size={20} />
            </button>

            {/* Runner indicator — centered pill at bottom (matches reference CSS .runner-indicator) */}
            <div
                aria-label="Indicador carrusel"
                style={{
                    position: 'absolute', left: '50%', bottom: '12px',
                    transform: 'translateX(-50%)',
                    display: 'grid', placeItems: 'center',
                    height: '44px', padding: '4px 10px',
                    background: 'var(--t-pill-bg)',
                    border: '1px solid var(--t-pill-border)',
                    borderRadius: '999px',
                    backdropFilter: 'blur(6px)',
                    zIndex: 5,
                }}
            >
                <video
                    ref={vidRef}
                    src={runnerWebm}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedMetadata={handleVideoLoad}
                    style={{ width: 40, height: 40, objectFit: 'contain' }}
                />
            </div>

            {/* Dot indicators — centered above runner pill */}
            <div
                style={{
                    position: 'absolute', bottom: '66px', left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: '8px', zIndex: 2,
                }}
            >
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => { setCurrent(i); startTimer() }}
                        aria-label={`Ir a slide ${i + 1}`}
                        style={{
                            width: i === current ? 24 : 8,
                            height: 8,
                            borderRadius: 999,
                            border: 'none',
                            background: i === current ? 'var(--t-accent)' : 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'width 0.3s, background 0.3s',
                        }}
                    />
                ))}
            </div>
        </section>
    )
}

/* ─── Home page ─── */
export default function Home() {
    const { data: workout } = useQuery({
        queryKey: queryKeys.performance.workout(),
        queryFn: () => api.get<WorkoutData>('/api/performance/workouts').then(r => r.data),
        staleTime: 60 * 60 * 1000,
    })

    const { data: resultsData } = useQuery({
        queryKey: queryKeys.performance.resultsPublic(1),
        queryFn: () => api.get<{ results: PublicResult[] }>('/api/performance/results/public?limit=4').then(r => r.data),
        staleTime: 5 * 60 * 1000,
    })

    const results = resultsData?.results ?? []

    const difficultyColor = {
        beginner: 'text-green-400',
        intermediate: 'text-yellow-400',
        advanced: 'text-[var(--t-accent)]',
    }

    return (
        <div style={{ color: 'var(--t-fg)' }}>

            {/* ── CAROUSEL ── */}
            <ImageCarousel />

            {/* ── SOBRE NOSOTROS ── */}
            <section id="nosotros" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <p className="text-sm font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--t-accent)' }}>Quiénes somos</p>
                <h2 className="text-4xl font-black mb-4">
                    Sobre <span style={{ color: 'var(--t-accent)' }}>nosotros</span>
                </h2>
                <p className="text-lg italic mb-8" style={{ color: 'var(--t-fg-muted)' }}>Corre, conecta y disfruta</p>
                <div className="space-y-5 leading-relaxed text-base sm:text-lg" style={{ color: 'var(--t-fg-muted)' }}>
                    <p>
                        Nuestra pasión es el movimiento compartido, y en La Costa del Sol hemos creado algo más que un grupo para correr: somos una comunidad de corredores sociales que disfrutan del deporte, la energía positiva y las conexiones reales con otros. Creemos que el running es mucho más que un ejercicio físico; es una forma de unir personas, de crear vínculos y de apoyarnos mutuamente en cada paso.
                    </p>
                    <p>
                        Nuestra filosofía es simple pero poderosa: que nadie se sienta solo en su camino. Aquí siempre encontrarás un grupo dispuesto a compartir kilómetros, sonrisas y momentos únicos. Organizamos quedadas, actividades y experiencias que giran en torno a nuestra pasión común: ¡el movimiento que nos conecta!
                    </p>
                    <p>
                        Queremos fomentar un ambiente inclusivo, motivador y alegre, donde cada miembro se sienta acompañado y energizado. Si decides apoyarnos con un café, estarás contribuyendo a que esta comunidad siga creciendo y fortaleciendo ese espacio de compañerismo y salud para todos. ¡Gracias por ser parte de este proyecto y por hacer que cada paso cuente!
                    </p>
                </div>
            </section>

            {/* ── STATS STRIP ── */}
            <section style={{ background: 'var(--t-bg2)', borderTop: '1px solid var(--t-border)', borderBottom: '1px solid var(--t-border)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                            { icon: Users, value: '300+', label: 'Corredores' },
                            { icon: Trophy, value: '500+', label: 'Carreras completadas' },
                            { icon: Zap, value: '52', label: 'Workouts al año' },
                        ].map(({ icon: Icon, value, label }) => (
                            <div key={label} className="flex flex-col items-center gap-1">
                                <Icon className="w-5 h-5 mb-1" style={{ color: 'var(--t-accent)' }} />
                                <span className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--t-fg)' }}>{value}</span>
                                <span className="text-xs sm:text-sm" style={{ color: 'var(--t-fg-dimmed)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── UBICACIONES ── */}
            <section id="ubicaciones" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="mb-10">
                    <p className="text-sm font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--t-accent)' }}>Dónde nos vemos</p>
                    <h2 className="text-4xl font-black mb-3" style={{ color: 'var(--t-fg)' }}>Ubicaciones</h2>
                    <p className="max-w-xl" style={{ color: 'var(--t-fg-muted)' }}>
                        Quedadas en puntos habituales de la costa. Consulta el detalle en los canales oficiales del club.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                        {
                            href: 'https://www.google.com/maps/search/?api=1&query=Paseo%20Mar%C3%ADtimo%20Fuengirola%20La%20Peseta',
                            img: locFuengirola,
                            alt: 'Paseo Marítimo de Fuengirola, zona La Peseta',
                            title: 'Paseo Marítimo (La Peseta)',
                            desc: 'Punto clásico en Fuengirola con trazado llano junto al mar.',
                        },
                        {
                            href: 'https://www.google.com/maps/search/?api=1&query=El%20Torre%C3%B3n%20La%20Cala%20de%20Mijas',
                            img: locTorreon,
                            alt: 'El Torreón en La Cala de Mijas',
                            title: 'El Torreón (La Cala de Mijas)',
                            desc: 'Salida habitual hacia el paseo litoral, con vistas abiertas.',
                        },
                    ].map(loc => (
                        <a
                            key={loc.title}
                            href={loc.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                            style={{
                                background: 'var(--t-bg2)',
                                border: '1px solid var(--t-border)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--t-accent)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--t-border)')}
                        >
                            <div style={{ height: 220, overflow: 'hidden' }}>
                                <img
                                    src={loc.img}
                                    alt={loc.alt}
                                    loading="lazy"
                                    style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        display: 'block',
                                        transition: 'transform 0.4s',
                                    }}
                                    className="group-hover:scale-105"
                                />
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--t-accent)' }} />
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--t-fg)' }}>{loc.title}</h3>
                                </div>
                                <p className="text-sm mb-4" style={{ color: 'var(--t-fg-muted)' }}>{loc.desc}</p>
                                <span className="text-sm font-medium" style={{ color: 'var(--t-accent)' }}>Ver en Google Maps →</span>
                            </div>
                        </a>
                    ))}
                </div>

                <p className="mt-8 text-sm text-center" style={{ color: 'var(--t-fg-dimmed)' }}>
                    El social run se realiza un domingo sí y otro no, normalmente a las 8:00.
                    Confirmar horarios por los canales oficiales de Instagram y WhatsApp.
                </p>
            </section>

            {/* ── PERFORMANCE CREW ── */}
            <section id="performance-crew" style={{ background: 'var(--t-bg2)', borderTop: '1px solid var(--t-border)', borderBottom: '1px solid var(--t-border)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                        <div className="flex-1">
                            <div
                                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
                                style={{ background: 'color-mix(in srgb, var(--t-accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)' }}
                            >
                                <Timer className="w-3.5 h-3.5" style={{ color: 'var(--t-accent)' }} />
                                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--t-accent)' }}>Cada miércoles</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: 'var(--t-fg)' }}>
                                Performance <span style={{ color: 'var(--t-accent)' }}>Crew</span>
                            </h2>
                            <p className="leading-relaxed max-w-lg" style={{ color: 'var(--t-fg-muted)' }}>
                                Sesiones de técnica y carrera cada miércoles para mejorar eficiencia, economía y velocidad. Orientado a todos los niveles con enfoque técnico y progresivo: calentamiento, drills, bloques de velocidad/ritmo y vuelta a la calma.
                            </p>
                        </div>
                        <div className="shrink-0">
                            <Link
                                to="/performance"
                                className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'var(--t-accent)', color: '#fff' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-accent-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--t-accent)')}
                            >
                                Ver sesiones <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── WORKOUT SEMANAL ── */}
            {workout && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--t-accent)' }}>Esta semana</p>
                            <h2 className="text-3xl font-bold" style={{ color: 'var(--t-fg)' }}>Workout del club</h2>
                        </div>
                        <Link to="/performance" className="flex items-center gap-1 text-sm transition-colors" style={{ color: 'var(--t-fg-dimmed)' }}>
                            Ver todos <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div
                        className="rounded-2xl p-6 transition-colors"
                        style={{ background: 'var(--t-bg2)', border: '1px solid var(--t-border)' }}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`text-xs font-medium capitalize ${difficultyColor[workout.difficulty_level as keyof typeof difficultyColor] ?? 'text-gray-400'}`}>
                                        {workout.difficulty_level}
                                    </span>
                                    <span style={{ color: 'var(--t-border)' }}>·</span>
                                    <span className="text-xs capitalize" style={{ color: 'var(--t-fg-muted)' }}>{workout.workout_type}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--t-fg)' }}>{workout.title}</h3>
                                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--t-fg-muted)' }}>{workout.description}</p>
                            </div>
                            <div className="flex sm:flex-col gap-4 sm:gap-2 sm:text-right shrink-0">
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--t-fg)' }}>{workout.estimated_distance}<span className="text-sm ml-1" style={{ color: 'var(--t-fg-muted)' }}>km</span></p>
                                    <p className="text-xs" style={{ color: 'var(--t-fg-dimmed)' }}>Distancia</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--t-fg)' }}>{workout.estimated_duration}<span className="text-sm ml-1" style={{ color: 'var(--t-fg-muted)' }}>min</span></p>
                                    <p className="text-xs" style={{ color: 'var(--t-fg-dimmed)' }}>Duración</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--t-border)' }}>
                            <Link to="/performance" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: 'var(--t-accent)' }}>
                                Ver plan completo <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ── ÚLTIMOS RESULTADOS ── */}
            {results.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--t-accent)' }}>Comunidad</p>
                            <h2 className="text-3xl font-bold" style={{ color: 'var(--t-fg)' }}>Últimos resultados</h2>
                        </div>
                        <Link to="/performance" className="flex items-center gap-1 text-sm transition-colors" style={{ color: 'var(--t-fg-dimmed)' }}>
                            Ver todos <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {results.map((result) => (
                            <div
                                key={result.id}
                                className="rounded-xl p-4 transition-colors"
                                style={{ background: 'var(--t-bg2)', border: '1px solid var(--t-border)' }}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold" style={{ color: 'var(--t-fg)' }}>{result.user_name}</p>
                                        <p className="text-sm mt-0.5" style={{ color: 'var(--t-fg-muted)' }}>{result.race_name || 'Entrenamiento'}</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--t-fg-dimmed)' }}>{formatDate(result.race_date)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg" style={{ color: 'var(--t-accent)' }}>{result.distance}km</p>
                                        {result.time && <p className="text-sm" style={{ color: 'var(--t-fg-muted)' }}>{result.time}</p>}
                                        {result.pace && <p className="text-xs" style={{ color: 'var(--t-fg-dimmed)' }}>{result.pace}/km</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── TIENDA CTA ── */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div
                    className="rounded-2xl p-8 sm:p-12 text-center"
                    style={{
                        background: 'color-mix(in srgb, var(--t-accent) 8%, var(--t-bg2))',
                        border: '1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)',
                    }}
                >
                    <ShoppingBag className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--t-accent)' }} />
                    <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--t-fg)' }}>Lleva el club contigo</h2>
                    <p className="mb-8 max-w-md mx-auto" style={{ color: 'var(--t-fg-muted)' }}>Camisetas oficiales LCRC para hombre y mujer. Corre con orgullo.</p>
                    <Link
                        to="/tienda"
                        className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl transition-all hover:scale-[1.02]"
                        style={{ background: 'var(--t-accent)', color: '#fff' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-accent-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--t-accent)')}
                    >
                        Ver tienda <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>
        </div>
    )
}
