export type ImpactOrder = {
    id: string;
    restaurantName: string;
    date: string;
    totalAmount: number;
    co2SavedG: number;
};

export const impactMock: {
    co2SavedG: number;
    impactedOrders: number;
    recentOrders: ImpactOrder[];
} = {
    co2SavedG: 12_400,
    impactedOrders: 9,
    recentOrders: Array.from({ length: 4 }, (_, index) => ({
        id: `mock-order-${index + 1}`,
        restaurantName: 'Restaurante',
        date: '2026-09-12',
        totalAmount: 9_600,
        co2SavedG: 200,
    })),
};
