import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Menu, X, Activity, Shield } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const { isAuthenticated, user, logout } = useAuthStore()
    const itemCount = useCartStore((s) => s.itemCount())
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const handleLogout = async () => {
        try { await api.post('/api/auth/logout') } catch { /* ignore */ }
        logout()
        queryClient.clear()
        navigate('/')
    }

    return (
        <nav
            className="sticky top-0 z-50 backdrop-blur-md border-b"
            style={{ background: 'var(--t-nav-bg)', borderColor: 'var(--t-border)' }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <Activity
                            className="w-6 h-6 group-hover:scale-110 transition-transform"
                            style={{ color: 'var(--t-accent)' }}
                        />
                        <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--t-fg)' }}>
                            LCRC<span style={{ color: 'var(--t-accent)' }}>.</span>
                        </span>
                    </Link>

                    {/* Nav links — Desktop */}
                    <div className="hidden md:flex items-center gap-8">
                        {[
                            { to: '/tienda', label: 'Tienda' },
                            { to: '/performance', label: 'Performance' },
                            { to: '/soporte', label: 'Contacto' },
                        ].map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className="text-sm font-medium transition-colors"
                                style={{ color: 'var(--t-fg-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-fg)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-fg-muted)')}
                            >
                                {label}
                            </Link>
                        ))}
                        {user?.role === 'ADMIN' && (
                            <Link
                                to="/admin"
                                className="flex items-center gap-1 text-sm font-semibold transition-colors"
                                style={{ color: 'var(--t-accent)' }}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {/* Theme toggle */}
                        <ThemeToggle />

                        {/* Cart */}
                        <Link
                            to="/checkout"
                            className="relative p-2 transition-colors"
                            style={{ color: 'var(--t-fg-muted)' }}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[var(--t-fg)] text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                                    style={{ background: 'var(--t-accent)' }}>
                                    {itemCount}
                                </span>
                            )}
                        </Link>

                        {/* Auth — Desktop */}
                        {isAuthenticated ? (
                            <div className="hidden md:flex items-center gap-3">
                                <Link
                                    to="/perfil"
                                    className="flex items-center gap-2 text-sm transition-colors"
                                    style={{ color: 'var(--t-fg-muted)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-fg)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-fg-muted)')}
                                >
                                    <User className="w-4 h-4" />
                                    <span>{user?.firstName}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs transition-colors"
                                    style={{ color: 'var(--t-fg-dimmed)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-fg-muted)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-fg-dimmed)')}
                                >
                                    Salir
                                </button>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-3">
                                <Link
                                    to="/login"
                                    className="text-sm transition-colors"
                                    style={{ color: 'var(--t-fg-muted)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-fg)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-fg-muted)')}
                                >
                                    Entrar
                                </Link>
                                <Link
                                    to="/registro"
                                    className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                                    style={{ background: 'var(--t-accent)', color: '#fff' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-accent-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--t-accent)')}
                                >
                                    Únete
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden p-2 transition-colors"
                            style={{ color: 'var(--t-fg-muted)' }}
                        >
                            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div
                    className="md:hidden px-4 py-4 flex flex-col gap-3 border-t"
                    style={{ background: 'var(--t-bg2)', borderColor: 'var(--t-border)' }}
                >
                    {[
                        { to: '/tienda', label: 'Tienda' },
                        { to: '/performance', label: 'Performance' },
                        { to: '/soporte', label: 'Contacto' },
                    ].map(({ to, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className="py-2 text-sm transition-colors"
                            style={{ color: 'var(--t-fg-muted)' }}
                            onClick={() => setMenuOpen(false)}
                        >
                            {label}
                        </Link>
                    ))}
                    <hr style={{ borderColor: 'var(--t-border)' }} />
                    {isAuthenticated ? (
                        <>
                            <Link
                                to="/perfil"
                                className="py-2 text-sm transition-colors"
                                style={{ color: 'var(--t-fg-muted)' }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Mi Perfil
                            </Link>
                            {user?.role === 'ADMIN' && (
                                <Link
                                    to="/admin"
                                    className="flex items-center gap-1 font-semibold py-2 text-sm"
                                    style={{ color: 'var(--t-accent)' }}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <Shield className="w-3.5 h-3.5" /> Panel Admin
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="text-left text-sm py-2 transition-colors"
                                style={{ color: 'var(--t-fg-dimmed)' }}
                            >
                                Cerrar sesión
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="py-2 text-sm transition-colors"
                                style={{ color: 'var(--t-fg-muted)' }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Entrar
                            </Link>
                            <Link
                                to="/registro"
                                className="text-center py-2 rounded-lg font-medium text-sm"
                                style={{ background: 'var(--t-accent)', color: '#fff' }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Únete al club
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    )
}
