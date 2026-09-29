import { Header } from '../components/layouts/Header';
import { RestaurantCard } from '../components/pages/RestaurantCard';
import { IoBicycleOutline } from "react-icons/io5";
import { TbLeaf } from "react-icons/tb";

export function Restaurants() {

    const restaurants = [
        { name: 'Kanu', description: '100% libre de gluten', img: '', tags: [{icon: <TbLeaf />, text: 'Envases compostables'}, {icon: <IoBicycleOutline />, text: 'Entrega en bici'}] },
        { name: 'Verde Bowl', description: 'Bowls y ensaladas', img: '', tags: [{icon: <TbLeaf />, text: 'Envases compostables'}, {icon: <IoBicycleOutline />, text: 'Entrega en bici'}] }
    ];

    return (
        <div className="page restaurant-page">
            <Header title="Catálogo" />
            {restaurants?.map((restaurant) => (
                <RestaurantCard key={restaurant.name} restaurant={restaurant}/>
            )) }
        </div>
    )
}
