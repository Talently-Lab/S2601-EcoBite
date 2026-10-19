import { ItemHeader } from "../shared/ItemHeader";
import { GreenBadge } from "../shared/GreenBadge";
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export type RestaurantProps = {
    id: string;
    name: string;
    description?: string;
    img?: string;
    tags?: { icon: ReactNode; text: string }[];
};

export function RestaurantCard({ restaurant }: { restaurant: RestaurantProps }) {
    return (
        <article className="restaurant-card">
            <Link className="restaurant-menu-link" to={`/restaurants/${encodeURIComponent(restaurant.id)}`}>
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
