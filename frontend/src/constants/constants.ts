export const COMUNAS = Array.from({ length: 15 }, (_, index) => index + 1);
export const LOCALE = 'es-AR';
export const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/restaurants', label: 'Restaurantes' },
    { to: '/impact', label: 'Impacto' },
    { to: '/cart', label: 'Carrito' },
];
export const RESTAURANTS_MESSAGES = {
    loadingTarget: 'restaurantes',
    error: 'No se pudieron cargar los restaurantes.',
    empty: 'No hay restaurantes disponibles.',
};
