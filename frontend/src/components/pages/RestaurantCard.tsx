import { ItemHeader } from "../shared/ItemHeader";
import { RestaurantTags } from './RestaurantTags';
import type { Restaurant } from '../../types/types';
import { Link } from 'react-router';

export function RestaurantCard({ restaurant }: { restaurant?: Restaurant }) {
    const loading = !restaurant;
    const restaurantImage = restaurant
        ? new URL(`../../assets/images/${restaurant.foodCategory}.webp`, import.meta.url).href
        : undefined;
    const header = <ItemHeader title={restaurant?.name ?? '\u00a0'} image={restaurantImage}
        imageAlt="" variant="vertical" loading={loading} />;

    return (
        <article className={`restaurant-card${loading ? ' restaurant-card--loading' : ''}`}
            aria-hidden={loading || undefined}>
            {restaurant
                ? <Link to={`/restaurants/${encodeURIComponent(restaurant.id)}`}>{header}</Link>
                : <div>{header}</div>}
            <RestaurantTags restaurant={restaurant} />
        </article>
    );
}
