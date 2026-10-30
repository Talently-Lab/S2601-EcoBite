import { RestaurantCard } from '../components/pages/RestaurantCard';
import { StatusMessage } from '../components/shared/StatusMessage';
import { useRestaurants } from '../hooks/useRestaurants';
import { RESTAURANTS_MESSAGES } from '../constants/constants';

export function Restaurants() {
    const { restaurants, status } = useRestaurants();
    const isLoading = status === 'loading';

    return (
        <div className="page restaurant-page">
            <h1 className="page-title">Catálogo</h1>
            <StatusMessage status={status} isEmpty={restaurants.length === 0}
                messages={RESTAURANTS_MESSAGES} />
            {isLoading
                ? Array.from({ length: Math.max(6, restaurants.length) }, (_, index) => (
                    <RestaurantCard key={`loading-${index}`} />
                ))
                : restaurants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}
        </div>
    );
}
