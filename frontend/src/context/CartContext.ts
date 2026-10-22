import { createContext, useContext } from 'react';
import type { CartItem, CartProduct, ConfirmedOrder } from '../types/types';
import type { OrderError } from '../services/orderService';

export type CartContextValue = {
    items: CartItem[];
    restaurantId: string | null;
    totalQuantity: number;
    totalCents: number;
    isSubmitting: boolean;
    purchaseError: OrderError | null;
    createdOrder: ConfirmedOrder | null;
    confirmPurchase: (distanceKm: number) => Promise<void>;
    closeConfirmationModal: () => void;
    addToCart: (product: CartProduct) => void;
    removeFromCart: (productId: string) => void;
    setQuantity: (productId: string, quantity: number) => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart debe usarse dentro de CartProvider.');
    return context;
}
