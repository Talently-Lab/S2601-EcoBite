import { ItemHeader } from "../shared/ItemHeader";
import { RestaurantTags } from './RestaurantTags';
import type { Restaurant } from '../../types/types';
import { Link } from 'react-router';
import homemadeImage from '../../assets/images/HOMEMADE.webp';
import fastFoodImage from '../../assets/images/FAST_FOOD.webp';
import coffeeImage from '../../assets/images/COFFEE_AND_DESSERTS.webp';
import healthyImage from '../../assets/images/HEALTHY.webp';
import veganImage from '../../assets/images/VEGAN.webp';
import internationalImage from '../../assets/images/INTERNATIONAL.webp';

const categoryImages: Record<Restaurant['foodCategory'], string> = {
    HOMEMADE: homemadeImage,
    FAST_FOOD: fastFoodImage,
    COFFEE_AND_DESSERTS: coffeeImage,
    HEALTHY: healthyImage,
    VEGAN: veganImage,
    INTERNATIONAL: internationalImage,
};

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
    return (
        <article className="restaurant-card">
            <Link to={`/restaurants/${encodeURIComponent(restaurant.id)}`}>
                <ItemHeader
                    title={restaurant.name}
                    image={categoryImages[restaurant.foodCategory]}
                    imageAlt=""
                    variant="vertical" />
            </Link>
            <RestaurantTags restaurant={restaurant} />
        </article>
    );
}
