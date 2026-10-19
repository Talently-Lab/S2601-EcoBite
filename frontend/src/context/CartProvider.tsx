import { useRef, useState, type ReactNode } from 'react';
import type { CartItem, CartProduct } from '../types/types';
import { CartContext } from './CartContext';

export type CartProviderProps = { children: ReactNode };

function validProduct(product: CartProduct): boolean {
    return Boolean(product.id && product.restaurantId && product.restaurantName && product.name)
        && Number.isSafeInteger(product.unitPriceCents) && product.unitPriceCents >= 0;
}

function validItems(items: CartItem[]): boolean {
    return items.every((item) => Number.isSafeInteger(item.quantity) && item.quantity >= 1
        && Number.isSafeInteger(item.unitPriceCents * item.quantity))
        && Number.isSafeInteger(items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0));
}

export function CartProvider({ children }: CartProviderProps) {
    const [items, setItems] = useState<CartItem[]>([]);
    const itemsRef = useRef<CartItem[]>([]);

    function updateItems(next: CartItem[]) {
        if (!validItems(next)) return;
        itemsRef.current = next;
        setItems(() => next);
    }

    function addToCart(product: CartProduct) {
        if (!validProduct(product)) return 'invalid' as const;
        const current = itemsRef.current;
        if (current.length && current[0].restaurantId !== product.restaurantId) return 'restaurant-conflict' as const;
        const exists = current.some((item) => item.id === product.id);
        const next = exists
            ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
            : [...current, { ...product, quantity: 1 }];
        if (!validItems(next)) return 'invalid' as const;
        updateItems(next);
        return 'added' as const;
    }

    function replaceCart(product: CartProduct) {
        if (!validProduct(product)) return 'invalid' as const;
        updateItems([{ ...product, quantity: 1 }]);
        return 'added' as const;
    }

    function removeFromCart(productId: string) {
        updateItems(itemsRef.current.filter((item) => item.id !== productId));
    }

    function setQuantity(productId: string, quantity: number) {
        if (!Number.isSafeInteger(quantity) || quantity < 1) return;
        updateItems(itemsRef.current.map((item) => item.id === productId ? { ...item, quantity } : item));
    }

    function clearCart() {
        updateItems([]);
    }

    const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
    const totalCents = items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);

    return (
        <CartContext value={{
            items, restaurantId: items[0]?.restaurantId ?? null, totalQuantity, totalCents,
            addToCart, replaceCart, removeFromCart, setQuantity, clearCart,
        }}>
            {children}
        </CartContext>
    );
}
