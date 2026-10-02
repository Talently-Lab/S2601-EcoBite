import { useEffect, useState } from 'react';
import { RestaurantCard } from '../components/pages/RestaurantCard';
import { getRestaurants } from '../services/restaurantService';
import type { RestaurantProps } from '../types/types';

export function Restaurants() {
    const [restaurants, setRestaurants] = useState<RestaurantProps[] | null>(null);
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
            {restaurants?.map((restaurant) => (
                <RestaurantCard key={restaurant.name} restaurant={restaurant} />
            ))}
        </div>
    );
}
