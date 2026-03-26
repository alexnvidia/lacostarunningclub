import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cart.store'

interface ProductDetail {
    id: string
    name: string
    description: string
    price: number
    stock_quantity: number
    front_image_url?: string
    back_image_url?: string
    category: string
    featured: boolean
    active: boolean
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function ProductoDetalle() {
    const { id } = useParams<{ id: string }>()
    const [selectedSize, setSelectedSize] = useState('')
    const [added, setAdded] = useState(false)
    const addItem = useCartStore(s => s.addItem)

    const { data: product, isLoading } = useQuery({
        queryKey: queryKeys.products.detail(id!),
        queryFn: () => api.get<ProductDetail>(`/api/products/${id}`).then(r => r.data),
        enabled: !!id,
    })

    const handleAddToCart = () => {
        if (!product || !selectedSize) return
        addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, size: selectedSize, imageUrl: product.front_image_url })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    if (isLoading) return (
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-[var(--t-bg2)] rounded-2xl animate-pulse" />
            <div className="space-y-4">
                <div className="h-8 bg-[var(--t-bg2)] rounded animate-pulse" />
                <div className="h-4 bg-[var(--t-bg2)] rounded w-1/3 animate-pulse" />
            </div>
        </div>
    )

    if (!product) return <div className="text-center py-20 text-[var(--t-fg-dimmed)]">Producto no encontrado</div>

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Link to="/tienda" className="inline-flex items-center gap-1 text-[var(--t-fg-muted)] hover:text-[var(--t-fg)] text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a la tienda
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Image */}
                <div className="aspect-square bg-[var(--t-bg2)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
                    {product.front_image_url ? (
                        <img src={product.front_image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-16 h-16 text-[var(--t-fg-dimmed)]" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col">
                    {product.featured && (
                        <span className="inline-flex items-center gap-1 text-[var(--t-accent2)] text-xs font-medium uppercase tracking-wider mb-2">⭐ Destacado</span>
                    )}
                    <h1 className="text-3xl font-black text-[var(--t-fg)] mb-2">{product.name}</h1>
                    <p className="text-4xl font-black text-[var(--t-accent)] mb-6">{formatPrice(product.price)}</p>
                    {product.description && (
                        <p className="text-[var(--t-fg-muted)] text-sm leading-relaxed mb-8">{product.description}</p>
                    )}

                    {/* Size selector */}
                    <div className="mb-6">
                        <p className="text-sm font-medium text-[var(--t-fg)] mb-3">Selecciona tu talla</p>
                        <div className="flex flex-wrap gap-2">
                            {SIZES.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`w-12 h-12 rounded-lg text-sm font-medium border transition-all ${selectedSize === size
                                            ? 'bg-[var(--t-accent)] border-[var(--t-accent)] text-[var(--t-fg)] scale-105'
                                            : 'bg-[var(--t-bg2)] border-[var(--t-border)] text-[var(--t-fg-muted)] hover:border-[var(--t-accent)]/40 hover:text-[var(--t-fg)]'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        disabled={!selectedSize || product.stock_quantity === 0}
                        className="mt-auto bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--t-fg)] font-semibold py-4 px-8 rounded-xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        {added ? '✓ Añadido al carrito' : !selectedSize ? 'Selecciona una talla' : 'Añadir al carrito'}
                    </button>

                    {product.stock_quantity === 0 && (
                        <p className="text-center text-[var(--t-fg-dimmed)] text-sm mt-3">Este producto está agotado</p>
                    )}
                </div>
            </div>
        </div>
    )
}
