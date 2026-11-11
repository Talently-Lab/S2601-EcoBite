import { useEffect, useSyncExternalStore } from 'react';
import { useCart } from '../context/CartContext';
import { getRestaurantsSnapshot, loadRestaurants, subscribeRestaurants } from '../services/restaurantService';

export function useRestaurants() {
    const { deliveryComuna } = useCart();
    const result = useSyncExternalStore(subscribeRestaurants, () => getRestaurantsSnapshot(deliveryComuna));

    useEffect(() => {
        loadRestaurants(deliveryComuna);
    }, [deliveryComuna]);

    return result;
}
