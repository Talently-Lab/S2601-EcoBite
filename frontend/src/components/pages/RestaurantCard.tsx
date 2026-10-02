import { ItemHeader } from "../shared/ItemHeader";
import { GreenBadge } from "../shared/GreenBadge";
import type { RestaurantProps } from '../../types/types';

export function RestaurantCard({ restaurant }: { restaurant: RestaurantProps }) {
    return (
        <article className="restaurant-card">
            <ItemHeader
                title={restaurant.name}
                description={restaurant.description}
                image={restaurant.img}
                variant="vertical" />
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
