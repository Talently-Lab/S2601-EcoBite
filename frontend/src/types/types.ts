export type Restaurant = {
    id: string;
    idRestaurant: string;
    name: string;
    packagingType: 'BIODEGRADABLE' | 'RECYCLABLE' | 'NON_RECYCLABLE';
    availableDeliveryMethod: 'BIKE' | 'MOTORCYCLE' | 'CAR';
    status: 'ACTIVE' | 'INACTIVE';
    sustainabilityIndicator: string;
};

export type CartProduct = {
    id: string;
    restaurantId: string;
    restaurantName: string;
    name: string;
    unitPriceCents: number;
    description?: string;
    image?: string;
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
};

export type ProductCardProps = { product: CartProduct };
export type CartItemProps = {
    item: CartItem;
    onRemove: () => void;
    onQuantityChange: (quantity: number) => void;
    disabled?: boolean;
};
export type QuantitySelectorProps = {
    value: number;
    onChange: (value: number) => void;
    onRemove?: () => void;
    label: string;
    disabled?: boolean;
};
