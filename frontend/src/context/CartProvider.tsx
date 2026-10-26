import { useRef, useState, type ReactNode } from 'react';
import type { CartItem, CartProduct, ConfirmedOrder } from '../types/types';
import { CartContext } from './CartContext';
import { createOrder, OrderError } from '../services/orderService';
import { isValidComuna } from '../constants/comunas';
import { getSubtotalCents, getTotalCents } from '../utils/price';

export type CartProviderProps = { children: ReactNode; userId: string };

const UNCERTAIN_PURCHASE_MESSAGE = 'No pudimos confirmar el resultado de la compra. La orden podría haberse creado. Verificá tus pedidos antes de volver a intentar.';

function comunaStorageKey(userId: string): string {
    return `ecobite:lastChosenComuna:${userId}`;
}

function savedComuna(userId: string): number | null {
    try {
        const comuna = Number(localStorage.getItem(comunaStorageKey(userId)));
        return isValidComuna(comuna) ? comuna : null;
    } catch {
        return null;
    }
}

function validProduct(product: CartProduct): boolean {
    return Boolean(product.id && product.restaurantId && product.restaurantName && product.name)
        && Number.isSafeInteger(product.unitPriceCents) && product.unitPriceCents >= 0;
}

function validItems(items: CartItem[]): boolean {
    return items.every((item) => Number.isSafeInteger(item.quantity) && item.quantity >= 1
        && Number.isSafeInteger(getSubtotalCents(item.unitPriceCents, item.quantity)))
        && Number.isSafeInteger(getTotalCents(items));
}

export function CartProvider({ children, userId }: CartProviderProps) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [deliveryComuna, setDeliveryComunaState] = useState<number | null>(() => savedComuna(userId));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purchaseError, setPurchaseError] = useState<OrderError | null>(null);
    const [createdOrder, setCreatedOrder] = useState<ConfirmedOrder | null>(null);
    const submittingRef = useRef(false);

    function setDeliveryComuna(comuna: number) {
        if (!isValidComuna(comuna)) return;
        setDeliveryComunaState(comuna);
        try {
            localStorage.setItem(comunaStorageKey(userId), String(comuna));
        } catch {
            // The current session still remembers the choice if storage is unavailable.
        }
    }

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

    async function confirmPurchase() {
        if (submittingRef.current || !items.length || deliveryComuna === null) return;

        // Lock before the first await: survives double clicks and route changes.
        submittingRef.current = true;
        setIsSubmitting(true);
        setPurchaseError(null);
        try {
            const order = await createOrder({
                restaurantId: items[0].restaurantId,
                deliveryComuna,
                items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
            });
            setCreatedOrder({ ...order, restaurantName: items[0].restaurantName });
            setItems([]);
        } catch (cause) {
            setPurchaseError(cause instanceof OrderError ? cause : new OrderError(
                UNCERTAIN_PURCHASE_MESSAGE,
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
    const totalCents = getTotalCents(items);

    return (
        <CartContext value={{
            items, restaurantId: items[0]?.restaurantId ?? null, totalQuantity, totalCents,
            deliveryComuna, setDeliveryComuna,
            isSubmitting, purchaseError, createdOrder, confirmPurchase, closeConfirmationModal,
            addToCart, removeFromCart, setQuantity,
        }}>
            {children}
        </CartContext>
    );
}
