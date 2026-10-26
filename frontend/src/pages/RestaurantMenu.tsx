import { Link, useParams } from 'react-router';
import { PageHeader } from '../components/core/PageHeader';
import { ProductCard } from '../components/pages/ProductCard';
import { RestaurantTags } from '../components/pages/RestaurantTags';
import { StatusMessage } from '../components/shared/StatusMessage';
import { useCart } from '../context/CartContext';
import { useRestaurants } from '../hooks/useRestaurants';
import type { CartProduct, Restaurant } from '../types/types';
import { priceToCents } from '../utils/price';
function menuProducts(restaurant: Restaurant): CartProduct[] {
    return restaurant.products.flatMap((product) => {
        const unitPriceCents = priceToCents(product.price);
        if (unitPriceCents === null) return [];
        return [{
            id: product.id,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            name: product.name,
            unitPriceCents,
        }];
    });
}

const MENU_MESSAGES = {
    loadingTarget: 'menú',
    error: 'No se pudo cargar el restaurante.',
    empty: 'No encontramos ese restaurante.',
};

const NO_PRODUCTS_MESSAGE = 'No hay platos disponibles en este restaurante.';

function PlanetCareCard({ restaurant }: { restaurant: Restaurant }) {
    if (restaurant.availableDeliveryMethod !== 'BIKE' || restaurant.packagingType !== 'BIODEGRADABLE') return null;

    return (
        <aside className="restaurant-menu-planet-card" aria-labelledby="planet-care-title">
            <h2 id="planet-care-title">Cómo cuidamos el planeta</h2>
            <p>Usamos envases biodegradables y entregamos en bici. Así cada pedido genera menos residuos.</p>
        </aside>
    );
}

export function RestaurantMenu() {
    const { id } = useParams();
    const { restaurantId: cartRestaurantId } = useCart();
    const { restaurants, status } = useRestaurants();
    const restaurant = restaurants.find((item) => item.id === id);
    const products = restaurant ? menuProducts(restaurant) : [];
    const cartBelongsToAnotherRestaurant = cartRestaurantId !== null && cartRestaurantId !== id;

    return (
        <div className="page restaurant-menu-page">
            <div className={`restaurant-menu-hero${restaurant ? ' restaurant-menu-hero--with-image' : ''}`}>
                {restaurant && <img src={new URL(`../assets/images/${restaurant.foodCategory}.webp`, import.meta.url).href} alt="" />}
                <PageHeader backTo="/restaurants" backLabel="Volver a restaurantes" />
            </div>
            {restaurant ? (
                <div className="restaurant-menu-content">
                    <header className="restaurant-menu-heading">
                        <h1>{restaurant.name}</h1>
                        <RestaurantTags restaurant={restaurant} variant="menu" />
                    </header>
                    <PlanetCareCard restaurant={restaurant} />
                    {cartBelongsToAnotherRestaurant && (
                        <p className="restaurant-menu-notice" role="status">
                            Tu carrito tiene platos de otro restaurante. <Link to="/cart">Vaciá el carrito</Link> para elegir acá.
                        </p>
                    )}
                    <section className="restaurant-menu-products" aria-label={`Platos de ${restaurant.name}`}>
                        <h2>Menú</h2>
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} disabled={cartBelongsToAnotherRestaurant} />
                        ))}
                        {!products.length && <p>{NO_PRODUCTS_MESSAGE}</p>}
                    </section>
                </div>
            ) : (
                <StatusMessage status={status} isEmpty messages={MENU_MESSAGES} />
            )}
        </div>
    );
}
