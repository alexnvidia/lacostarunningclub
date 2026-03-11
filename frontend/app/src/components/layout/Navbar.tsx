import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Menu, X, Activity, Shield } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const { isAuthenticated, user, logout } = useAuthStore()
    const itemCount = useCartStore((s) => s.itemCount())
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const handleLogout = async () => {
        try { await api.post('/api/auth/logout') } catch { /* ignore */ }
        logout()
        queryClient.clear()   // 🔑 borra toda la caché para que no se filtren datos del usuario anterior
        navigate('/')
    }

    return (
        <nav className="sticky top-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-[#2a2a2a]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <Activity className="w-6 h-6 text-[#e63946] group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-white text-lg tracking-tight">
                            LCRC<span className="text-[#e63946]">.</span>
                        </span>
                    </Link>

                    {/* Nav links — Desktop */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/tienda" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Tienda</Link>
                        <Link to="/performance" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Performance</Link>
                        <Link to="/soporte" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Contacto</Link>
                        {user?.role === 'ADMIN' && (
                            <Link to="/admin" className="flex items-center gap-1 text-[#e63946] hover:text-[#c1121f] text-sm font-semibold transition-colors">
                                <Shield className="w-3.5 h-3.5" />
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {/* Cart */}
                        <Link to="/checkout" className="relative p-2 text-gray-300 hover:text-white transition-colors">
                            <ShoppingCart className="w-5 h-5" />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#e63946] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                    {itemCount}
                                </span>
                            )}
                        </Link>

                        {/* Auth */}
                        {isAuthenticated ? (
                            <div className="hidden md:flex items-center gap-3">
                                <Link to="/perfil" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                                    <User className="w-4 h-4" />
                                    <span>{user?.firstName}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    Salir
                                </button>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-3">
                                <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Entrar</Link>
                                <Link
                                    to="/registro"
                                    className="bg-[#e63946] hover:bg-[#c1121f] text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                                >
                                    Únete
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu toggle */}
                        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-300">
                            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden bg-[#1a1a1a] border-t border-[#2a2a2a] px-4 py-4 flex flex-col gap-3">
                    <Link to="/tienda" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Tienda</Link>
                    <Link to="/performance" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Performance</Link>
                    <Link to="/soporte" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Contacto</Link>
                    <hr className="border-[#2a2a2a]" />
                    {isAuthenticated ? (
                        <>
                            <Link to="/perfil" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Mi Perfil</Link>
                            {user?.role === 'ADMIN' && (
                                <Link to="/admin" className="flex items-center gap-1 text-[#e63946] font-semibold py-2" onClick={() => setMenuOpen(false)}>
                                    <Shield className="w-3.5 h-3.5" /> Panel Admin
                                </Link>
                            )}
                            <button onClick={handleLogout} className="text-left text-gray-500 hover:text-gray-300 py-2">Cerrar sesión</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Entrar</Link>
                            <Link to="/registro" className="bg-[#e63946] text-white text-center py-2 rounded-lg font-medium" onClick={() => setMenuOpen(false)}>Únete al club</Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    )
}
