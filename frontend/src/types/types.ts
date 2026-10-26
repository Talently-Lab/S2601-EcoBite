import type { ReactNode } from 'react';

export type Restaurant = {
    id: string;
    idRestaurant: string;
    name: string;
    foodCategory: 'HOMEMADE' | 'FAST_FOOD' | 'COFFEE_AND_DESSERTS' | 'HEALTHY' | 'VEGAN' | 'INTERNATIONAL';
    packagingType: 'BIODEGRADABLE' | 'RECYCLABLE' | 'NON_RECYCLABLE';
    availableDeliveryMethod: 'BIKE' | 'MOTORCYCLE' | 'CAR';
    status: 'ACTIVE' | 'INACTIVE';
    sustainabilityIndicator: string;
    products: { id: string; name: string; price: string }[];
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
};

export type CatalogProduct = Omit<CartProduct, 'restaurantName'>;
export type CartItem = CartProduct & { quantity: number };

export type CreateOrderInput = {
    restaurantId: string;
    deliveryComuna: number;
    items: { productId: string; quantity: number }[];
};

export type CreatedOrder = {
    id: string;
    totalAmount: number;
    co2SavedG: number;
    deliveryMethod?: Restaurant['availableDeliveryMethod'];
};

export type ConfirmedOrder = CreatedOrder & { restaurantName: string };

