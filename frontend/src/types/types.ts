import type { ReactNode } from 'react';

export type Restaurant = {
    id: string;
    idRestaurant: string;
    name: string;
    packagingType: 'BIODEGRADABLE' | 'RECYCLABLE' | 'NON_RECYCLABLE';
    availableDeliveryMethod: 'BIKE' | 'MOTORCYCLE' | 'CAR';
    status: 'ACTIVE' | 'INACTIVE';
    sustainabilityIndicator: string;
};

export type RestaurantProps = {
    id: string;
    name: string;
    description?: string;
    img?: string;
    tags?: { icon: ReactNode; text: string }[];
};

export type CartProduct = {
    id: string;
    restaurantId: string;
    restaurantName: string;
    name: string;
    unitPriceCents: number;
    description?: string;
    isMock?: boolean;
};

export type CatalogProduct = Omit<CartProduct, 'restaurantName'>;
export type CartItem = CartProduct & { quantity: number };

export type CreateOrderInput = {
    restaurantId: string;
    distanceKm: number;
    items: { productId: string; quantity: number }[];
};

export type CreatedOrder = {
    id: string;
    totalAmount: number;
    co2SavedG: number;
    deliveryMethod?: Restaurant['availableDeliveryMethod'];
};

export type ConfirmedOrder = CreatedOrder & { restaurantName: string; isPreview?: boolean };

