export const queryKeys = {
    user: {
        profile: () => ['user', 'profile'] as const,
    },
    products: {
        list: (filters?: Record<string, unknown>) => ['products', 'list', filters] as const,
        detail: (id: string) => ['products', 'detail', id] as const,
        stock: (id: string) => ['products', 'stock', id] as const,
    },
    orders: {
        list: (status?: string) => ['orders', 'list', status] as const,
        detail: (id: string) => ['orders', 'detail', id] as const,
        history: () => ['orders', 'history'] as const,
    },
    performance: {
        workout: (week?: number, year?: number) => ['performance', 'workout', week, year] as const,
        workoutByWeek: (week: number, year: number) => ['performance', 'workout', week, year] as const,
        resultsPublic: (page: number) => ['performance', 'results', 'public', page] as const,
        resultsMine: (filters?: Record<string, unknown>) => ['performance', 'results', 'mine', filters] as const,
    },
    tickets: {
        list: (status?: string) => ['tickets', 'list', status] as const,
        detail: (id: string) => ['tickets', 'detail', id] as const,
    },
    admin: {
        stats: (period?: string) => ['admin', 'stats', period] as const,
        salesStats: (from?: string, to?: string) => ['admin', 'stats', 'sales', from, to] as const,
        orders: (status?: string, page?: number) => ['admin', 'orders', status, page] as const,
        orderDetail: (id: string) => ['admin', 'orders', id] as const,
        users: (search?: string, role?: string, page?: number) => ['admin', 'users', search, role, page] as const,
        subscriptions: (page?: number) => ['admin', 'subscriptions', page] as const,
        tickets: (status?: string, assignedTo?: string) => ['admin', 'tickets', status, assignedTo] as const,
        products: (search?: string, active?: string, page?: number) => ['admin', 'products', search, active, page] as const,
        productDetail: (id: string) => ['admin', 'products', id] as const,
    },
} as const
