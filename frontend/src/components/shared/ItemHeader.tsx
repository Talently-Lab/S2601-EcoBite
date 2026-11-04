import { ImageWithFallback } from './ImageWithFallback';

type ItemHeaderProps = {
    title: string;
    image?: string;
    imageAlt?: string;
    variant?: 'horizontal' | 'vertical';
};

export function ItemHeader({ title, image, imageAlt = title, variant = 'horizontal' }: ItemHeaderProps) {
    return (
        <div className={`item-header item-header--${variant}`}>
            {image !== undefined && (
                <ImageWithFallback src={image} alt={imageAlt} />
            )}

            <h3>{title}</h3>
        </div>
    );
}
