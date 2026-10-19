import { createContext, useContext } from 'react';
import type { CartItem, CartProduct } from '../types/types';

export type CartMutationResult = 'added' | 'restaurant-conflict' | 'invalid';

export type CartContextValue = {
    items: CartItem[];
    restaurantId: string | null;
    totalQuantity: number;
    totalCents: number;
    addToCart: (product: CartProduct) => CartMutationResult;
    replaceCart: (product: CartProduct) => CartMutationResult;
    removeFromCart: (productId: string) => void;
    setQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart debe usarse dentro de CartProvider.');
    return context;
}
