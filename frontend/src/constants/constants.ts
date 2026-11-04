import type { Restaurant } from '../types/types';

export const COMUNAS = Array.from({ length: 15 }, (_, index) => index + 1);
export const LOCALE = 'es-AR';
export const getRestaurantImage = (category: Restaurant['foodCategory']) =>
    new URL(`../assets/images/${category}.webp`, import.meta.url).href;
export const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/restaurants', label: 'Restaurantes' },
    { to: '/impact', label: 'Impacto' },
    { to: '/cart', label: 'Carrito' },
];
export const FOOD_CATEGORY_LABELS: Record<Restaurant['foodCategory'], string> = {
    HOMEMADE: 'Comida casera',
    FAST_FOOD: 'Fast Food',
    COFFEE_AND_DESSERTS: 'Café y postres',
    HEALTHY: 'Saludable',
    VEGAN: 'Vegano',
    INTERNATIONAL: 'Internacional',
};
export const RESTAURANTS_MESSAGES = {
    loadingTarget: 'restaurantes',
    error: 'No se pudieron cargar los restaurantes.',
    empty: 'No hay restaurantes disponibles.',
    emptyFiltered: 'No encontramos restaurantes con esos filtros.',
};
