import { Link, useParams } from 'react-router';
import { PageHeader } from '../components/core/PageHeader';
import { ProductCard } from '../components/pages/ProductCard';
import { StatusMessage } from '../components/shared/StatusMessage';
import { useCart } from '../context/CartContext';
import { getMockProductsForRestaurant } from '../data/mockProducts';
import { useRestaurants } from '../hooks/useRestaurants';

const MENU_MESSAGES = {
    loadingTarget: 'menú',
    error: 'No se pudo cargar el restaurante.',
    empty: 'No encontramos ese restaurante.',
};

export function RestaurantMenu() {
    const { id } = useParams();
    const { restaurantId: cartRestaurantId } = useCart();
    const { restaurants, status } = useRestaurants();
    const restaurant = restaurants.find((item) => item.id === id);
    const cartBelongsToAnotherRestaurant = Boolean(cartRestaurantId && cartRestaurantId !== id);

    return (
        <div className="page restaurant-menu-page">
            <PageHeader backTo="/restaurants" backLabel="Volver a restaurantes" />
            {restaurant ? (
                <>
                    <header className="restaurant-menu-heading">
                        <h1>{restaurant.name}</h1>
                    </header>
                    {cartBelongsToAnotherRestaurant && (
                        <p className="restaurant-menu-notice" role="status">
                            Tu carrito tiene platos de otro restaurante. <Link to="/cart">Vaciá el carrito</Link> para elegir acá.
                        </p>
                    )}
                    <section className="restaurant-menu-products" aria-label={`Platos de ${restaurant.name}`}>
                        {getMockProductsForRestaurant(restaurant).map((product) => (
                            <ProductCard key={product.id} product={product} disabled={cartBelongsToAnotherRestaurant} />
                        ))}
                    </section>
                </>
            ) : (
                <StatusMessage status={status} isEmpty={!restaurant} messages={MENU_MESSAGES} />
            )}
        </div>
    );
}
