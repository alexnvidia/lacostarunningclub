import { Link } from 'react-router-dom'
import { Activity, Instagram, MessageCircle, MapPin } from 'lucide-react'

export function Footer() {
    return (
        <footer style={{ background: 'var(--t-bg)', borderTop: '1px solid var(--t-border)' }} className="mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />
                            <span className="font-bold text-base" style={{ color: 'var(--t-fg)' }}>La Costa Running Club</span>
                        </Link>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--t-fg-muted)' }}>
                            Tu comunidad de running en la Costa del Sol. Entrenamos, corremos y crecemos juntos.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--t-fg)' }}>Club</h3>
                        <ul className="space-y-2 text-sm" style={{ color: 'var(--t-fg-muted)' }}>
                            <li><Link to="/performance" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.8 }}>Performance Crew</Link></li>
                            <li><Link to="/tienda" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.8 }}>Tienda oficial</Link></li>
                            <li><Link to="/soporte" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.8 }}>Contacto</Link></li>
                        </ul>
                    </div>

                    {/* Social + Locations */}
                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--t-fg)' }}>Encuéntranos</h3>
                        <div className="space-y-3 text-sm" style={{ color: 'var(--t-fg-muted)' }}>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--t-accent)' }} />
                                <span>Fuengirola · Mijas</span>
                            </div>
                            <div className="flex items-center gap-4 mt-4">
                                <a
                                    href="https://instagram.com/lacosta_rc"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ background: 'var(--t-bg2)' }}
                                    aria-label="Instagram"
                                >
                                    <Instagram className="w-4 h-4" style={{ color: 'var(--t-accent)' }} />
                                </a>
                                <a
                                    href="https://chat.whatsapp.com/GjFMkoDvWvYEBiTjUT4rWd"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ background: 'var(--t-bg2)' }}
                                    aria-label="WhatsApp"
                                >
                                    <MessageCircle className="w-4 h-4" style={{ color: 'var(--t-accent)' }} />
                                </a>
                                <a
                                    href="https://www.strava.com/clubs/1741673"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ background: 'var(--t-bg2)' }}
                                    aria-label="Strava"
                                >
                                    {/* Strava wordmark path — official SVG brand asset */}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        className="w-4 h-4"
                                        fill="currentColor"
                                        style={{ color: 'var(--t-accent)' }}
                                        aria-hidden="true"
                                    >
                                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 text-center text-xs" style={{ borderTop: '1px solid var(--t-border)', color: 'var(--t-fg-dimmed)' }}>
                    © {new Date().getFullYear()} La Costa Running Club · Hecho con ❤️ en Fuengirola
                </div>
            </div>
        </footer>
    )
}
