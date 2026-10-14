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
