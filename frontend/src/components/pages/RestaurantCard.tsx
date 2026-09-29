import { ItemHeader } from "../shared/ItemHeader";
import { GreenBadge } from "../shared/GreenBadge";

type RestaurantCardProps = {
    restaurant: {
        name: string;
        description: string;
        img?: string;
        tags?: { icon: React.ReactNode, text: string }[]
    };
};

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
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
