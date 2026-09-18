import { ItemHeader } from "./common/ItemHeader";

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
      {image && <img src={image} alt={restaurant.name} />}
      <ItemHeader
        title={restaurant.name}
        description={restaurant.description}/>
    </article>
  );
}
