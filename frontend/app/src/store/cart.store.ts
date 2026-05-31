import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
    productId: string
    name: string
    price: number
    quantity: number
    size?: string
    color?: string
    imageUrl?: string
}

interface CartState {
    items: CartItem[]
    addItem: (item: CartItem) => void
    removeItem: (productId: string, size?: string) => void
    updateQuantity: (productId: string, quantity: number, size?: string) => void
    clearCart: () => void
    total: () => number
    itemCount: () => number
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) =>
                set((state) => {
                    const key = `${item.productId}-${item.size || ''}`
                    const existing = state.items.find(
                        (i) => `${i.productId}-${i.size || ''}` === key
                    )
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                `${i.productId}-${i.size || ''}` === key
                                    ? { ...i, quantity: i.quantity + item.quantity }
                                    : i
                            ),
                        }
                    }
                    return { items: [...state.items, item] }
                }),

            removeItem: (productId, size) =>
                set((state) => ({
                    items: state.items.filter(
                        (i) => !(i.productId === productId && i.size === size)
                    ),
                })),

            updateQuantity: (productId, quantity, size) =>
                set((state) => ({
                    items: state.items.map((i) =>
                        i.productId === productId && i.size === size ? { ...i, quantity } : i
                    ),
                })),

            clearCart: () => set({ items: [] }),

            total: () =>
                get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

            itemCount: () =>
                get().items.reduce((sum, item) => sum + item.quantity, 0),
        }),
        { name: 'lcrc-cart' }
    )
)
