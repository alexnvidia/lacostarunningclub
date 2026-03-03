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
    in_stock: boolean
    front_image_url?: string
    category: string
    active: boolean
}

export default function Tienda() {
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.products.list({ category, active: true }),
        queryFn: () => api.get<{ products: Product[] }>(`/api/products?active=true${category ? `&category=${category}` : ''}&limit=50`).then(r => r.data),
        staleTime: 5 * 60 * 1000,
    })

    const products = (data?.products ?? []).filter(p =>
        search === '' || p.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-8">
                <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-2">Tienda oficial</p>
                <h1 className="text-4xl font-black text-white">Camisetas LCRC</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar productos..."
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 outline-none text-sm transition-colors"
                    />
                </div>
                <div className="flex gap-2">
                    {['', 't-shirts', 'hats', 'accessories'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${category === cat
                                ? 'bg-[#e63946] border-[#e63946] text-white'
                                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a]'
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
                        <div key={i} className="bg-[#1a1a1a] rounded-xl aspect-square animate-pulse" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500">No hay productos disponibles</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <Link
                            key={product.id}
                            to={`/tienda/${product.id}`}
                            className="group bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#e63946]/30 transition-all hover:-translate-y-1"
                        >
                            {/* Image */}
                            <div className="aspect-square bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
                                {product.front_image_url ? (
                                    <img src={product.front_image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                ) : (
                                    <ShoppingBag className="w-10 h-10 text-gray-600" />
                                )}
                            </div>
                            {/* Info */}
                            <div className="p-3">
                                <p className="text-white font-medium text-sm line-clamp-1">{product.name}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[#e63946] font-bold">{formatPrice(product.price)}</span>
                                    {!product.in_stock && (
                                        <span className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded">Sin stock</span>
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
