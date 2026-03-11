import { Link } from 'react-router-dom'
import { Activity, Instagram, MessageCircle, MapPin } from 'lucide-react'

export function Footer() {
    return (
        <footer className="bg-[#0d0d0d] border-t border-[#2a2a2a] mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-[#e63946]" />
                            <span className="font-bold text-white">La Costa Running Club</span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Tu comunidad de running en la Costa del Sol. Entrenamos, corremos y crecemos juntos.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Club</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/performance" className="hover:text-white transition-colors">Performance Crew</Link></li>
                            <li><Link to="/tienda" className="hover:text-white transition-colors">Tienda oficial</Link></li>
                            <li><Link to="/soporte" className="hover:text-white transition-colors">Contacto</Link></li>
                        </ul>
                    </div>

                    {/* Social + Locations */}
                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Encuéntranos</h3>
                        <div className="space-y-3 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#e63946] shrink-0" />
                                <span>Fuengirola · Mijas</span>
                            </div>
                            <div className="flex items-center gap-4 mt-4">
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                                    className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors">
                                    <Instagram className="w-4 h-4 text-[#e63946]" />
                                </a>
                                <a href="https://wa.me" target="_blank" rel="noopener noreferrer"
                                    className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors">
                                    <MessageCircle className="w-4 h-4 text-[#e63946]" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-[#2a2a2a] mt-8 pt-6 text-center text-xs text-gray-600">
                    © {new Date().getFullYear()} La Costa Running Club · Hecho con ❤️ en Fuengirola
                </div>
            </div>
        </footer>
    )
}
