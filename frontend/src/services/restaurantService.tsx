import { IoBicycleOutline } from "react-icons/io5";
import { TbLeaf } from "react-icons/tb";
import type { RestaurantProps } from '../types/types';

const restaurants: RestaurantProps[] = [
    { name: 'Kanu', description: '100% libre de gluten', img: '', tags: [{ icon: <TbLeaf />, text: 'Envases compostables' }, { icon: <IoBicycleOutline />, text: 'Entrega en bici' }] },
    { name: 'Verde Bowl', description: 'Bowls y ensaladas', img: '', tags: [{ icon: <TbLeaf />, text: 'Envases compostables' }, { icon: <IoBicycleOutline />, text: 'Entrega en bici' }] }
];

export const getRestaurants = async (): Promise<RestaurantProps[]> => {
    return restaurants;
};
