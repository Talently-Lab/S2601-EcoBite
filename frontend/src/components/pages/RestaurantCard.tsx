import { ItemHeader } from "../shared/ItemHeader";
import { ImageWithFallback } from '../shared/ImageWithFallback';

type RestaurantCardProps = {
    restaurant: {
        name: string;
        description: string;
    };
    image?: string;
};

export function RestaurantCard({ restaurant, image }: RestaurantCardProps) {
    return (
        <article className="restaurant-card">
            {image !== undefined && (
                <ImageWithFallback src={image} alt={restaurant.name} />
            )}
            <ItemHeader
                title={restaurant.name}
                description={restaurant.description} />
        </article>
    );
}
