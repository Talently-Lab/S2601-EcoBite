import type { ReactNode } from 'react';

export type RestaurantProps = {
    name: string;
    description: string;
    img?: string;
    tags?: { icon: ReactNode; text: string }[];
};
