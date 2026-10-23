import { IoBicycleOutline } from 'react-icons/io5';
import { TbLeaf } from 'react-icons/tb';
import { RestaurantCard } from '../components/pages/RestaurantCard';
import { StatusMessage } from '../components/shared/StatusMessage';
import { useRestaurants } from '../hooks/useRestaurants';
import type { Restaurant, RestaurantProps } from '../types/types';

type RestaurantTags = NonNullable<RestaurantProps['tags']>;

const packagingTags: Record<Restaurant['packagingType'], RestaurantTags> = {
    BIODEGRADABLE: [{ icon: <TbLeaf />, text: 'Envases biodegradables' }],
    RECYCLABLE: [{ icon: <TbLeaf />, text: 'Envases reciclables' }],
    NON_RECYCLABLE: [],
};

const deliveryTags: Record<Restaurant['availableDeliveryMethod'], RestaurantTags> = {
    BIKE: [{ icon: <IoBicycleOutline />, text: 'Entrega en bici' }],
    MOTORCYCLE: [],
    CAR: [],
};

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
            {restaurants.map((restaurant) => {
                const tags: RestaurantTags = [
                    ...packagingTags[restaurant.packagingType],
                    ...deliveryTags[restaurant.availableDeliveryMethod],
                ];

                return (
                    <RestaurantCard
                        key={restaurant.id}
                        restaurant={{
                            ...restaurant,
                            tags,
                        }}
                    />
                );
            })}
        </div>
    );
}
