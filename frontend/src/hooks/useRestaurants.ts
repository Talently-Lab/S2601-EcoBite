import { useEffect, useState } from 'react';
import { getRestaurants } from '../services/restaurantService';
import type { Restaurant } from '../types/types';
import { useCart } from '../context/CartContext';

type RestaurantsStatus = 'loading' | 'error' | 'ready';
type RestaurantsResult = {
    comuna: number | null;
    restaurants: Restaurant[];
    status: Exclude<RestaurantsStatus, 'loading'>;
};
type UseRestaurantsResult = { restaurants: Restaurant[]; status: RestaurantsStatus };

export function useRestaurants(): UseRestaurantsResult {
    const { deliveryComuna } = useCart();
    const [result, setResult] = useState<RestaurantsResult | null>(null);

    useEffect(() => {
        let active = true;

        getRestaurants(deliveryComuna)
            .then((data) => {
                if (active) {
                    setResult({ comuna: deliveryComuna, restaurants: data, status: 'ready' });
                }
            })
            .catch((err: unknown) => {
                if (active) {
                    console.error(err);
                    setResult({ comuna: deliveryComuna, restaurants: [], status: 'error' });
                }
            });

        return () => {
            active = false;
        };
    }, [deliveryComuna]);

    return result?.comuna === deliveryComuna
        ? { restaurants: result.restaurants, status: result.status }
        : { restaurants: result?.restaurants ?? [], status: 'loading' };
}
