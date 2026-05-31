import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag, Search } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatPrice } from '@/lib/utils'

interface Product {
    id: string
    name: string
    description: string
    price: number
    stock_quantity: number
    featured: boolean
    front_image_url?: string
    category: string
    active: boolean
}

export default function Shop() {
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.products.list({ category, active: true }),
        queryFn: () => api.get<{ products: Product[] }>(`/api/products?active=true${category ? `&category=${category}` : ''}&limit=50`).then(r => r.data),
        staleTime: 60 * 60 * 1000, // Cache de 1 hora
    })

    const products = (data?.products ?? []).filter(p =>
        search === '' || p.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-8">
                <p className="text-[var(--t-accent)] text-sm font-medium uppercase tracking-wider mb-2">Tienda oficial</p>
                <h1 className="text-4xl font-black text-[var(--t-fg)]">Productos LCRC</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-fg-dimmed)]" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar productos..."
                        className="w-full bg-[var(--t-bg2)] border border-[var(--t-border)] focus:border-[var(--t-accent)] rounded-lg pl-10 pr-4 py-2.5 text-[var(--t-fg)] placeholder-[var(--t-fg-dimmed)] outline-none text-sm transition-colors"
                    />
                </div>
                <div className="flex gap-2">
                    {['', 't-shirts', 'hats', 'accessories'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${category === cat
                                ? 'bg-[var(--t-accent)] border-[var(--t-accent)] text-[var(--t-fg)]'
                                : 'bg-[var(--t-bg2)] border-[var(--t-border)] text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] hover:border-[var(--t-border)]'
                                }`}
                        >
                            {cat === '' ? 'Todos' : cat === 't-shirts' ? 'Camisetas' : cat === 'hats' ? 'Gorras' : 'Accesorios'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-[var(--t-bg2)] rounded-xl aspect-square animate-pulse" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-[var(--t-fg-dimmed)]">No hay productos disponibles</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <Link
                            key={product.id}
                            to={`/tienda/${product.id}`}
                            className="group bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-xl overflow-hidden hover:border-[var(--t-accent)]/30 transition-all hover:-translate-y-1"
                        >
                            {/* Image */}
                            <div className="aspect-square bg-[var(--t-bg)] flex items-center justify-center overflow-hidden p-4">
                                {product.front_image_url ? (
                                    <img src={product.front_image_url} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                ) : (
                                    <ShoppingBag className="w-10 h-10 text-[var(--t-fg-dimmed)]" />
                                )}
                            </div>
                            {/* Info */}
                            <div className="p-3">
                                <p className="text-[var(--t-fg)] font-medium text-sm line-clamp-1">{product.name}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[var(--t-accent)] font-bold">{formatPrice(product.price)}</span>
                                    {product.stock_quantity <= 0 && (
                                        <span className="text-xs text-[var(--t-fg-dimmed)] bg-[var(--t-bg)] px-2 py-0.5 rounded border border-[var(--t-border)]">Sin stock</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
