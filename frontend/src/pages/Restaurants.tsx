import { RestaurantCard } from '../components/pages/RestaurantCard';
import { StatusMessage } from '../components/shared/StatusMessage';
import { useRestaurants } from '../hooks/useRestaurants';

const RESTAURANTS_MESSAGES = {
    loadingTarget: 'restaurantes',
    error: 'No se pudieron cargar los restaurantes.',
    empty: 'No hay restaurantes disponibles.',
};

export function Restaurants() {
    const { restaurants, status } = useRestaurants();

    return (
        <div className="page restaurant-page">
            <h1 className="page-title">Catálogo</h1>
            <StatusMessage status={status} isEmpty={restaurants.length === 0} messages={RESTAURANTS_MESSAGES} />
            {restaurants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}
        </div>
    );
}
