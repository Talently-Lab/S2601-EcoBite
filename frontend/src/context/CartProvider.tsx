import { useRef, useState, type ReactNode } from 'react';
import type { CartItem, CartProduct, ConfirmedOrder } from '../types/types';
import { CartContext } from './CartContext';
import { createOrder, OrderError } from '../services/orderService';
import { CHECKOUT_PREVIEW_ENABLED } from '../config/checkout';

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purchaseError, setPurchaseError] = useState<OrderError | null>(null);
    const [createdOrder, setCreatedOrder] = useState<ConfirmedOrder | null>(null);
    const submittingRef = useRef(false);

    function updateItems(update: (current: CartItem[]) => CartItem[]) {
        if (submittingRef.current) return;
        setItems((current) => {
            const next = update(current);
            return validItems(next) ? next : current;
        });
    }

    function addToCart(product: CartProduct) {
        if (!validProduct(product)) return;
        updateItems((current) => {
            if (current.length && current[0].restaurantId !== product.restaurantId) return current;
            return current.some((item) => item.id === product.id)
                ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
                : [...current, { ...product, quantity: 1 }];
        });
    }

    function removeFromCart(productId: string, restaurantId: string) {
        updateItems((current) => current.filter((item) => item.id !== productId || item.restaurantId !== restaurantId));
    }

    function setQuantity(productId: string, restaurantId: string, quantity: number) {
        if (!Number.isSafeInteger(quantity) || quantity < 1) return;
        updateItems((current) => current.map((item) =>
            item.id === productId && item.restaurantId === restaurantId ? { ...item, quantity } : item));
    }

    async function confirmPurchase(distanceKm: number) {
        if (submittingRef.current || !items.length || (!CHECKOUT_PREVIEW_ENABLED && items.some((item) => item.isMock))) return;

        // Lock before the first await: survives double clicks and route changes.
        submittingRef.current = true;
        setIsSubmitting(true);
        setPurchaseError(null);
        try {
            const order = CHECKOUT_PREVIEW_ENABLED
                ? {
                    id: `DEMO-${String(Date.now()).slice(-6)}`,
                    totalAmount: totalCents / 100,
                    co2SavedG: 200,
                    deliveryMethod: 'BIKE' as const,
                    isPreview: true,
                }
                : await createOrder({
                    restaurantId: items[0].restaurantId,
                    distanceKm,
                    items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
                });
            setCreatedOrder({ ...order, restaurantName: items[0].restaurantName });
            setItems([]);
        } catch (cause) {
            setPurchaseError(cause instanceof OrderError ? cause : new OrderError(
                'No pudimos confirmar el resultado de la compra. La orden podría haberse creado. Verificá tus pedidos antes de volver a intentar.',
                { outcome: 'uncertain', cause },
            ));
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }

    function closeConfirmationModal() {
        setCreatedOrder(null);
    }

    const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
    const totalCents = items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);

    return (
        <CartContext value={{
            items, restaurantId: items[0]?.restaurantId ?? null, totalQuantity, totalCents,
            isSubmitting, purchaseError, createdOrder, confirmPurchase, closeConfirmationModal,
            addToCart, removeFromCart, setQuantity,
        }}>
            {children}
        </CartContext>
    );
}
