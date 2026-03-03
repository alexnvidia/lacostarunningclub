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
} as const
