import { ItemHeader } from "../shared/ItemHeader";
import { RestaurantTags } from './RestaurantTags';
import type { Restaurant } from '../../types/types';
import { Link } from 'react-router';

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
    return (
        <article className="restaurant-card">
            <Link to={`/restaurants/${encodeURIComponent(restaurant.id)}`}>
                <ItemHeader
                    title={restaurant.name}
                    image=""
                    variant="vertical" />
            </Link>
            <RestaurantTags restaurant={restaurant} />
        </article>
    );
}
