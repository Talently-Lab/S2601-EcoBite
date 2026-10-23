import { ItemHeader } from "../shared/ItemHeader";
import { GreenBadge } from "../shared/GreenBadge";
import type { RestaurantProps } from '../../types/types';
import { Link } from 'react-router';

export function RestaurantCard({ restaurant }: { restaurant: RestaurantProps }) {
    return (
        <article className="restaurant-card">
            <Link to={`/restaurants/${encodeURIComponent(restaurant.id)}`}>
                <ItemHeader
                    title={restaurant.name}
                    description={restaurant.description}
                    image=""
                    variant="vertical" />
            </Link>
            {restaurant.tags?.length ? (
                <div className="restaurant-card-tags">
                    {restaurant.tags.map((tag) => (
                        <GreenBadge key={tag.text} icon={tag.icon} text={tag.text} variant="tag" />
                    ))}
                </div>
            ) : null}
        </article>
    );
}
