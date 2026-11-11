import { useParams } from 'react-router';
import { PageHeader } from '../components/core/PageHeader';
import { Breadcrumbs } from '../components/layouts/Breadcrumbs';
import { ProductCard } from '../components/pages/ProductCard';
import { RestaurantTags } from '../components/pages/RestaurantTags';
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { getRestaurantImage } from '../constants/constants';
import { OtherRestaurantNotice, StatusMessage } from '../components/shared/StatusMessage';
import { SectionHeader } from '../components/shared/SectionHeader';
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

function PlanetCareCard({ restaurant }: { restaurant: Restaurant }) {
    if (restaurant.availableDeliveryMethod !== 'BIKE' || restaurant.packagingType !== 'BIODEGRADABLE') return null;

    return (
        <aside className="restaurant-menu-planet-card" aria-labelledby="planet-care-title">
            <h2 id="planet-care-title">Cómo cuidamos el planeta</h2>
            <p>Usamos envases compostables y entregamos en bici. Así cada pedido genera menos residuos.</p>
        </aside>
    );
}

export function RestaurantMenu() {
    const { id } = useParams();
    const { hasOtherRestaurant } = useCart();
    const { restaurants, status } = useRestaurants();
    const restaurant = restaurants.find((item) => item.id === id);
    const products = restaurant ? menuProducts(restaurant) : [];
    const cartBelongsToAnotherRestaurant = restaurant ? hasOtherRestaurant(restaurant.id) : false;

    return (
        <div className="page">
            {restaurant && <Breadcrumbs currentPage={restaurant.name} parents={[{ label: 'Restaurantes', to: '/restaurants' }]} />}
            <div className={`restaurant-menu-hero${restaurant ? ' restaurant-menu-hero--with-image' : ''}`}>
                {restaurant && <ImageWithFallback src={getRestaurantImage(restaurant.foodCategory)} alt="" />}
                <PageHeader backTo="/restaurants" backLabel="Volver a restaurantes" mobileOnly={Boolean(restaurant)} />
            </div>
            {restaurant ? (
                <div className="restaurant-menu-content">
                    <div className="restaurant-menu-heading">
                        <SectionHeader variant="h1" title={restaurant.name} />
                        <RestaurantTags restaurant={restaurant} variant="menu" />
                    </div>
                    <PlanetCareCard restaurant={restaurant} />
                    {cartBelongsToAnotherRestaurant && <OtherRestaurantNotice />}
                    <section className="restaurant-menu-products" aria-label={`Platos de ${restaurant.name}`}>
                        <h2>Menú</h2>
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} disabled={cartBelongsToAnotherRestaurant} />
                        ))}
                    </section>
                </div>
            ) : (
                <StatusMessage status={status} isEmpty messages={MENU_MESSAGES} showLoading />
            )}
        </div>
    );
}
