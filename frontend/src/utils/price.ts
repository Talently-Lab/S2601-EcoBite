import type { CartItem } from '../types/types';

const priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
    return priceFormatter.format(price);
}

export function priceToCents(price: string): number | null {
    if (!/^\d+(?:\.\d{1,2})?$/.test(price)) return null;
    const cents = Math.round(Number(price) * 100);
    return Number.isSafeInteger(cents) ? cents : null;
}

export function centsToPrice(cents: number): number {
    return cents / 100;
}

export function getSubtotalCents(unitPriceCents: number, quantity: number): number {
    return unitPriceCents * quantity;
}

export function getTotalCents(items: CartItem[]): number {
    return items.reduce((total, item) => total + getSubtotalCents(item.unitPriceCents, item.quantity), 0);
}
