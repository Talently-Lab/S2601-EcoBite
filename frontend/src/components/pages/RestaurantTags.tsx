import { IoBicycleOutline } from 'react-icons/io5';
import { TbLeaf } from 'react-icons/tb';
import { GreenBadge } from '../shared/GreenBadge';
import type { Restaurant } from '../../types/types';

type Tag = { icon: React.ReactNode; text: string };
type RestaurantTagsProps = {
    restaurant?: Restaurant;
    variant?: 'catalog' | 'menu';
};

const loadingTags: Tag[] = [
    { icon: null, text: 'Envases compostables' },
    { icon: null, text: 'Entrega en bici' },
];

const packagingTags: Record<Restaurant['packagingType'], Tag[]> = {
    BIODEGRADABLE: [{ icon: <TbLeaf aria-hidden="true" />, text: 'Envases compostables' }],
    RECYCLABLE: [{ icon: <TbLeaf aria-hidden="true" />, text: 'Envases reciclables' }],
    NON_RECYCLABLE: [],
};

const deliveryTags: Record<Restaurant['availableDeliveryMethod'], Tag[]> = {
    BIKE: [{ icon: <IoBicycleOutline aria-hidden="true" />, text: 'Entrega en bici' }],
    MOTORCYCLE: [],
    CAR: [],
};

export function RestaurantTags({ restaurant, variant = 'catalog' }: RestaurantTagsProps) {
    const loading = !restaurant;
    const tags = loading ? loadingTags : [
        ...packagingTags[restaurant.packagingType],
        ...deliveryTags[restaurant.availableDeliveryMethod],
    ];

    return tags.length ? (
        <div className={`restaurant-tags restaurant-tags--${variant}`}>
            {tags.map((tag) => <GreenBadge key={tag.text} icon={tag.icon} text={tag.text} variant="tag" />)}
        </div>
    ) : null;
}
