import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    Package, ArrowLeft, Search, Plus, Pencil, Trash2, RotateCcw,
    X, ChevronLeft, ChevronRight, Star, StarOff, ImageOff
} from 'lucide-react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Product {
    id: string
    product_code: string
    name: string
    description: string | null
    price: number
    stock_quantity: number
    category: string
    size: string | null
    color: string | null
    front_image_url: string | null
    back_image_url: string | null
    active: boolean
    featured: boolean
    created_at: string
}

interface ProductsResponse {
    products: Product[]
    pagination: { page: number; limit: number; total: number; total_pages: number }
}

interface ProductForm {
    product_code: string
    name: string
    description: string
    price: string
    stock_quantity: string
    category_name: string
    size: string
    color: string
    front_image_url: string
    back_image_url: string
    featured: boolean
    active: boolean
}

const EMPTY_FORM: ProductForm = {
    product_code: '',
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    category_name: '',
    size: '',
    color: '',
    front_image_url: '',
    back_image_url: '',
    featured: false,
    active: true,
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

// ─── Debounce hook ──────────────────────────────────────────────────────────

function useDebounce(fn: (v: string) => void, delay: number) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    return useCallback((value: string) => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => fn(value), delay)
    }, [fn, delay]) // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Image thumbnail ────────────────────────────────────────────────────────

function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
    const [error, setError] = useState(false)
    if (!src || error) {
        return (
            <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center shrink-0">
                <ImageOff className="w-4 h-4 text-gray-600" />
            </div>
        )
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setError(true)}
            className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#2a2a2a]"
        />
    )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AdminProductos() {
    const qc = useQueryClient()

    // filters
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState<'true' | 'false'>('true')
    const [page, setPage] = useState(1)

    const onSearchDebounced = useDebounce((v: string) => {
        setDebouncedSearch(v)
        setPage(1)
    }, 400)

    // modal state
    const [modal, setModal] = useState<'create' | 'edit' | null>(null)
    const [editTarget, setEditTarget] = useState<Product | null>(null)
    const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
    const [formError, setFormError] = useState<string | null>(null)

    // ─── Query ────────────────────────────────────────────────────────────

    const params = new URLSearchParams({ page: String(page), limit: '20', active: activeFilter })
    if (debouncedSearch) params.set('search', debouncedSearch)

    const { data, isLoading } = useQuery<ProductsResponse>({
        queryKey: queryKeys.admin.products(debouncedSearch || undefined, activeFilter, page),
        queryFn: () => api.get(`/api/products?${params}`).then(r => r.data),
    })

    const invalidate = () =>
        qc.invalidateQueries({ queryKey: ['admin', 'products'] })

    // ─── Mutations ────────────────────────────────────────────────────────

    const createMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) => api.post('/api/products', body),
        onSuccess: () => { invalidate(); closeModal() },
        onError: (err: any) => setFormError(err?.response?.data?.error ?? 'Error al crear el producto'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
            api.put(`/api/products/${id}`, body),
        onSuccess: () => { invalidate(); closeModal() },
        onError: (err: any) => setFormError(err?.response?.data?.error ?? 'Error al actualizar el producto'),
    })

    const deactivateMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/api/products/${id}`),
        onSuccess: () => invalidate(),
    })

    const reactivateMutation = useMutation({
        mutationFn: (id: string) => api.put(`/api/products/${id}`, { active: true }),
        onSuccess: () => invalidate(),
    })

    // ─── Modal helpers ────────────────────────────────────────────────────

    function openCreate() {
        setForm(EMPTY_FORM)
        setFormError(null)
        setModal('create')
    }

    function openEdit(p: Product) {
        setEditTarget(p)
        setForm({
            product_code: p.product_code,
            name: p.name,
            description: p.description ?? '',
            price: String(p.price),
            stock_quantity: String(p.stock_quantity),
            category_name: p.category,
            size: p.size ?? '',
            color: p.color ?? '',
            front_image_url: p.front_image_url ?? '',
            back_image_url: p.back_image_url ?? '',
            featured: p.featured,
            active: p.active,
        })
        setFormError(null)
        setModal('edit')
    }

    function closeModal() {
        setModal(null)
        setEditTarget(null)
        setFormError(null)
    }

    function handleField(key: keyof ProductForm, value: string | boolean) {
        setForm(f => ({ ...f, [key]: value }))
    }

    function buildBody(f: ProductForm): Record<string, unknown> {
        const body: Record<string, unknown> = {
            name: f.name,
            description: f.description || null,
            price: parseFloat(f.price),
            stock_quantity: parseInt(f.stock_quantity, 10) || 0,
            category_name: f.category_name,
            featured: f.featured,
        }
        if (f.size) body.size = f.size
        if (f.color) body.color = f.color
        if (f.front_image_url) body.front_image_url = f.front_image_url
        if (f.back_image_url) body.back_image_url = f.back_image_url
        return body
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setFormError(null)
        if (!form.name || !form.price || !form.category_name) {
            setFormError('Nombre, precio y categoría son obligatorios')
            return
        }
        if (modal === 'create') {
            if (!form.product_code) { setFormError('El código de producto es obligatorio'); return }
            createMutation.mutate({ product_code: form.product_code, ...buildBody(form) })
        } else if (modal === 'edit' && editTarget) {
            updateMutation.mutate({ id: editTarget.id, body: buildBody(form) })
        }
    }

    const isMutating = createMutation.isPending || updateMutation.isPending

    // ─── Render ───────────────────────────────────────────────────────────

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

            {/* Back link */}
            <Link to="/admin" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Panel Admin
            </Link>

            {/* Header */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
                <div>
                    <p className="text-[#e63946] text-sm font-medium uppercase tracking-wider mb-1">Admin</p>
                    <h1 className="text-3xl font-black text-white flex items-center gap-2">
                        <Package className="w-7 h-7" /> Productos
                    </h1>
                </div>

                <div className="ml-auto flex gap-3 flex-wrap items-center">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        <input
                            id="product-search"
                            type="search"
                            autoComplete="off"
                            placeholder="Buscar por nombre..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); onSearchDebounced(e.target.value) }}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg pl-9 pr-4 py-2 text-white placeholder-gray-600 outline-none text-sm transition-colors w-56"
                        />
                    </div>

                    {/* Active filter */}
                    <select
                        id="active-filter"
                        value={activeFilter}
                        onChange={e => { setActiveFilter(e.target.value as 'true' | 'false'); setPage(1) }}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2 text-white outline-none text-sm transition-colors"
                    >
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                    </select>

                    {/* Create button */}
                    <button
                        id="btn-new-product"
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-[#e63946] hover:bg-[#c1121f] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nuevo producto
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-[40px_1fr_1fr_80px_80px_80px_80px_80px_100px] gap-3 px-6 py-3 border-b border-[#2a2a2a] text-xs text-gray-500 uppercase tracking-wider">
                    <span />
                    <span>Producto</span>
                    <span>Categoría</span>
                    <span>Precio</span>
                    <span>Stock</span>
                    <span>Talla</span>
                    <span>Color</span>
                    <span>Estado</span>
                    <span className="text-right">Acciones</span>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-12 bg-[#2a2a2a] rounded animate-pulse" />
                        ))}
                    </div>
                ) : (data?.products ?? []).length === 0 ? (
                    <p className="text-center py-16 text-gray-500">Sin productos</p>
                ) : (
                    <div className="divide-y divide-[#2a2a2a]">
                        {data!.products.map(p => (
                            <div
                                key={p.id}
                                className="grid grid-cols-[40px_1fr_1fr_80px_80px_80px_80px_80px_100px] gap-3 items-center px-6 py-3 hover:bg-[#2a2a2a]/40 transition-colors"
                            >
                                {/* Thumbnail */}
                                <ProductThumbnail src={p.front_image_url} alt={p.name} />

                                {/* Name + SKU + featured */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                                        {p.featured && <Star className="w-3 h-3 text-yellow-400 shrink-0" />}
                                    </div>
                                    <p className="text-gray-500 text-[11px] font-mono mt-0.5 truncate">{p.product_code}</p>
                                </div>

                                {/* Category */}
                                <p className="text-gray-400 text-sm truncate">{p.category}</p>

                                {/* Price */}
                                <p className="text-white text-sm font-semibold">{p.price.toFixed(2)} €</p>

                                {/* Stock */}
                                <p className={`text-sm font-medium ${p.stock_quantity === 0 ? 'text-red-400' : p.stock_quantity < 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {p.stock_quantity}
                                </p>

                                {/* Size */}
                                <p className="text-gray-400 text-sm">{p.size ?? '—'}</p>

                                {/* Color */}
                                <p className="text-gray-400 text-sm truncate">{p.color ?? '—'}</p>

                                {/* Status badge */}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${p.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {p.active ? 'Activo' : 'Inactivo'}
                                </span>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        title="Editar"
                                        onClick={() => openEdit(p)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {p.active ? (
                                        <button
                                            title="Desactivar"
                                            onClick={() => deactivateMutation.mutate(p.id)}
                                            disabled={deactivateMutation.isPending}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    ) : (
                                        <button
                                            title="Reactivar"
                                            onClick={() => reactivateMutation.mutate(p.id)}
                                            disabled={reactivateMutation.isPending}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-40"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {data && data.pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2a2a]">
                        <p className="text-xs text-gray-500">{data.pagination.total} productos</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 bg-[#2a2a2a] text-gray-400 rounded-lg disabled:opacity-40 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gray-400 px-2">{page} / {data.pagination.total_pages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))}
                                disabled={page === data.pagination.total_pages}
                                className="p-1.5 bg-[#2a2a2a] text-gray-400 rounded-lg disabled:opacity-40 hover:text-white transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal create / edit ─────────────────────────────────── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

                    {/* Panel */}
                    <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2a2a2a] sticky top-0 bg-[#1a1a1a] z-10">
                            <h2 className="text-white font-bold text-lg">
                                {modal === 'create' ? 'Nuevo producto' : `Editar: ${editTarget?.name}`}
                            </h2>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">

                            {/* Error banner */}
                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {/* Product code — only on create */}
                                {modal === 'create' && (
                                    <Field label="Código (SKU) *" span={1}>
                                        <input
                                            id="field-product-code"
                                            value={form.product_code}
                                            onChange={e => handleField('product_code', e.target.value)}
                                            placeholder="LCRC-001"
                                            className={inputCls}
                                        />
                                    </Field>
                                )}

                                {/* Name */}
                                <Field label="Nombre *" span={modal === 'create' ? 1 : 2}>
                                    <input
                                        id="field-name"
                                        value={form.name}
                                        onChange={e => handleField('name', e.target.value)}
                                        placeholder="Camiseta LCRC"
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Category */}
                                <Field label="Categoría *" span={1}>
                                    <input
                                        id="field-category"
                                        value={form.category_name}
                                        onChange={e => handleField('category_name', e.target.value)}
                                        placeholder="Ropa"
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Price */}
                                <Field label="Precio (€) *" span={1}>
                                    <input
                                        id="field-price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.price}
                                        onChange={e => handleField('price', e.target.value)}
                                        placeholder="25.00"
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Stock */}
                                <Field label="Stock" span={1}>
                                    <input
                                        id="field-stock"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.stock_quantity}
                                        onChange={e => handleField('stock_quantity', e.target.value)}
                                        placeholder="0"
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Size */}
                                <Field label="Talla" span={1}>
                                    <select
                                        id="field-size"
                                        value={form.size}
                                        onChange={e => handleField('size', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="">Sin talla</option>
                                        {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>

                                {/* Color */}
                                <Field label="Color" span={1}>
                                    <input
                                        id="field-color"
                                        value={form.color}
                                        onChange={e => handleField('color', e.target.value)}
                                        placeholder="Rojo"
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Front image */}
                                <Field label="URL imagen frontal" span={2}>
                                    <input
                                        id="field-front-image"
                                        value={form.front_image_url}
                                        onChange={e => handleField('front_image_url', e.target.value)}
                                        placeholder="https://..."
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Back image */}
                                <Field label="URL imagen trasera" span={2}>
                                    <input
                                        id="field-back-image"
                                        value={form.back_image_url}
                                        onChange={e => handleField('back_image_url', e.target.value)}
                                        placeholder="https://..."
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Description */}
                                <Field label="Descripción" span={2}>
                                    <textarea
                                        id="field-description"
                                        rows={3}
                                        value={form.description}
                                        onChange={e => handleField('description', e.target.value)}
                                        placeholder="Descripción del producto..."
                                        className={`${inputCls} resize-none`}
                                    />
                                </Field>
                            </div>

                            {/* Toggles */}
                            <div className="flex gap-6 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        id="field-featured"
                                        type="checkbox"
                                        checked={form.featured}
                                        onChange={e => handleField('featured', e.target.checked)}
                                        className="w-4 h-4 accent-[#e63946]"
                                    />
                                    <span className="flex items-center gap-1.5 text-sm text-gray-300">
                                        <Star className="w-3.5 h-3.5 text-yellow-400" /> Destacado
                                    </span>
                                </label>
                                {modal === 'edit' && (
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            id="field-active"
                                            type="checkbox"
                                            checked={form.active}
                                            onChange={e => handleField('active', e.target.checked)}
                                            className="w-4 h-4 accent-[#e63946]"
                                        />
                                        <span className="text-sm text-gray-300">Activo</span>
                                    </label>
                                )}
                            </div>

                            {/* Starred icon preview */}
                            {form.featured && (
                                <p className="flex items-center gap-1.5 text-xs text-yellow-400/80">
                                    <StarOff className="w-3.5 h-3.5" />
                                    Este producto aparecerá como destacado en la tienda
                                </p>
                            )}

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-[#2a2a2a] mt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    id="btn-submit-product"
                                    type="submit"
                                    disabled={isMutating}
                                    className="flex items-center gap-2 bg-[#e63946] hover:bg-[#c1121f] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                                >
                                    {isMutating ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : modal === 'create' ? (
                                        <><Plus className="w-4 h-4" /> Crear producto</>
                                    ) : (
                                        <><Pencil className="w-4 h-4" /> Guardar cambios</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Helper components ──────────────────────────────────────────────────────

const inputCls = 'w-full bg-[#111] border border-[#2a2a2a] focus:border-[#e63946] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm transition-colors'

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: 1 | 2 }) {
    return (
        <div className={span === 2 ? 'col-span-2' : 'col-span-1'}>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
            {children}
        </div>
    )
}

