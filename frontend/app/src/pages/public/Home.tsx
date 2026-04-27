import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowRight, Zap, Trophy, Users, ShoppingBag, ChevronRight, ChevronLeft, MapPin, Timer } from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/utils'

// Ubicaciones estáticas (se mantienen locales si no se pasan a Cloudinary)
import locFuengirola from '@/assets/carousel/loc-fuengirola.webp'
import locTorreon from '@/assets/carousel/loc-torreon.jpg'

// Obtener imágenes del carrusel desde las variables de entorno
const carouselImagesEnv = (import.meta.env.VITE_CLOUDINARY_CAROUSEL_IMAGES as string) || 'people.jpg,staff.jpg,paseo.jpg';
const carouselFilenames: string[] = carouselImagesEnv.split(',').map((v: string) => v.trim()).filter(Boolean);
const CLOUDINARY_CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || 'tu_cloud_name';

interface SlideData {
    src: string;
    alt: string;
    caption: string;
}

const SLIDES: SlideData[] = carouselFilenames.map((filename: string, index: number) => ({
    src: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/v1/lcrc/carousel/${filename}`,
    alt: `Momento LCRC ${index + 1}`,
    caption: `La Costa Running Club` // Puedes personalizar esto o quitarlo si lo deseas
}));



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

    // Pause auto-advance timer on hover
    const handleMouseEnter = () => {
        stopTimer()
    }
    const handleMouseLeave = () => {
        startTimer()
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

            {/* SVG Dot Indicators — centered pill at bottom */}
            <div
                aria-label="Indicador carrusel"
                style={{
                    position: 'absolute', left: '50%', bottom: '20px',
                    transform: 'translateX(-50%)',
                    display: 'flex', gap: '8px', alignItems: 'center',
                    height: '40px', padding: '0 16px',
                    background: 'var(--t-pill-bg)',
                    border: '1px solid var(--t-pill-border)',
                    borderRadius: '999px',
                    backdropFilter: 'blur(6px)',
                    zIndex: 5,
                }}
            >
                {SLIDES.map((_, i) => (
                    <svg
                        key={i}
                        width={i === current ? 24 : 8}
                        height="8"
                        viewBox={`0 0 ${i === current ? 24 : 8} 8`}
                        onClick={() => { setCurrent(i); startTimer() }}
                        style={{
                            cursor: 'pointer',
                            display: 'block',
                            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        aria-label={`Ir a slide ${i + 1}`}
                        role="button"
                    >
                        <rect
                            x="0"
                            y="0"
                            width={i === current ? 24 : 8}
                            height="8"
                            rx="4"
                            fill={i === current ? 'var(--t-accent)' : 'rgba(255,255,255,0.4)'}
                            style={{
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        />
                    </svg>
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

    // Extraer la lista de videos desde las variables de entorno (separados por coma)
    // Si no existen en el entorno, se usan los por defecto para no romper el diseño.
    const desktopVideosEnv = import.meta.env.VITE_CLOUDINARY_DESKTOP_VIDEOS || 'P1004532.mp4';
    const mobileVideosEnv = import.meta.env.VITE_CLOUDINARY_MOBILE_VIDEOS || 'P1004615.mp4';

    const DESKTOP_VIDEOS = desktopVideosEnv.split(',').map((v: string) => v.trim()).filter(Boolean);
    const MOBILE_VIDEOS = mobileVideosEnv.split(',').map((v: string) => v.trim()).filter(Boolean);

    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'tu_cloud_name';

    // Seleccionamos un video al azar al montar el componente
    const [bgVideos] = useState(() => {
        const desktopVideo = DESKTOP_VIDEOS[Math.floor(Math.random() * DESKTOP_VIDEOS.length)];
        const mobileVideo = MOBILE_VIDEOS[Math.floor(Math.random() * MOBILE_VIDEOS.length)];

        return {
            desktop: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/v1777284858/${desktopVideo}`,
            mobile: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/v1777284859/${mobileVideo}`
        };
    });

    return (
        <div className="relative min-h-screen pb-24" style={{ color: 'var(--t-fg)' }}>
            {/* Blurred Seamless Background Video */}
            <div className="fixed inset-0 w-full h-full z-0 overflow-hidden" style={{ backgroundColor: 'var(--t-bg)' }}>
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-[1.2] opacity-30 pointer-events-none"
                    style={{ filter: 'blur(10px)' }}
                >
                    <source src={bgVideos.mobile} media="(max-width: 768px)" type="video/mp4" />
                    <source src={bgVideos.desktop} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--t-bg)] opacity-70 pointer-events-none" />
            </div>

            <div className="relative z-10">
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
                                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--t-accent)' }}>Cada Lunes</span>
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
                                        <span className={`text-xs font-medium capitalize ${difficultyColor[workout.difficulty_level as keyof typeof difficultyColor] ?? 'text-[var(--t-fg-muted)]'}`}>
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
        </div>
    )
}
