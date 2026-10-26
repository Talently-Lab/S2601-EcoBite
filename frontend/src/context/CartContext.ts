import { createContext, useContext } from 'react';
import type { CartItem, CartProduct, ConfirmedOrder } from '../types/types';
import type { OrderError } from '../services/orderService';

export type CartContextValue = {
    items: CartItem[];
    restaurantId: string | null;
    totalQuantity: number;
    totalCents: number;
    deliveryComuna: number | null;
    setDeliveryComuna: (comuna: number) => void;
    isSubmitting: boolean;
    purchaseError: OrderError | null;
    createdOrder: ConfirmedOrder | null;
    confirmPurchase: () => Promise<void>;
    closeConfirmationModal: () => void;
    addToCart: (product: CartProduct) => void;
    removeFromCart: (productId: string, restaurantId: string) => void;
    setQuantity: (productId: string, restaurantId: string, quantity: number) => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart debe usarse dentro de CartProvider.');
    return context;
}
