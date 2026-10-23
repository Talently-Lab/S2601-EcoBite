import type { CartProduct, Restaurant } from '../types/types';

// Catálogo temporal de frontend. Estos IDs no existen en la base de datos.
const mockProducts = [
    {
        key: 'plato-equilibrado',
        name: 'Plato equilibrado',
        description: 'Pechuga de pollo a la plancha, quinoa, una ensalada, zanahoria rallada y trozos de calabaza.',
        unitPriceCents: 980000,
    },
    {
        key: 'sushi',
        name: 'Sushi de salmón y palta',
        description: 'Ocho piezas de sushi con salmón, palta y arroz, acompañadas de jengibre y wasabi.',
        unitPriceCents: 1250000,
    },
    {
        key: 'hamburguesa',
        name: 'Hamburguesa con papas',
        description: 'Hamburguesa con queso, lechuga y tomate, servida con papas fritas.',
        unitPriceCents: 1100000,
    },
    {
        key: 'torta',
        name: 'Torta de chocolate',
        description: 'Porción de torta de chocolate con cobertura cremosa y frutilla.',
        unitPriceCents: 750000,
    },
] as const;

export function getMockProductsForRestaurant(restaurant: Pick<Restaurant, 'id' | 'name'>): CartProduct[] {
    return mockProducts.map(({ key, ...product }) => ({
        ...product,
        id: `${restaurant.id}:mock:${key}`,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        isMock: true,
    }));
}
