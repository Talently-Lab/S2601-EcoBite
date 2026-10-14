import { useEffect, useState } from 'react';
import { IoBicycleOutline } from 'react-icons/io5';
import { TbLeaf } from 'react-icons/tb';
import { RestaurantCard } from '../components/pages/RestaurantCard';
import { getRestaurants } from '../services/restaurantService';
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

export function Restaurants() {
    const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        getRestaurants()
            .then((data) => {
                if (active) setRestaurants(data);
            })
            .catch(() => {
                if (active) setError('No se pudieron cargar los restaurantes.');
            });

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="page restaurant-page">
            <h1 className="page-title">Catálogo</h1>
            {error ? (
                <p role="alert">{error}</p>
            ) : restaurants === null ? (
                <p role="status">Cargando restaurantes...</p>
            ) : restaurants.length === 0 ? (
                <p>No hay restaurantes disponibles.</p>
            ) : null}
            {restaurants?.map((restaurant) => {
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
