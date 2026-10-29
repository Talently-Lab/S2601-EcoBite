import { ImageWithFallback } from './ImageWithFallback';

type ItemHeaderProps = {
	title: string;
	description?: string;
	image?: string;
    imageAlt?: string;
    variant?: 'horizontal' | 'vertical';
};

export function ItemHeader({title, description, image, imageAlt = title, variant = 'horizontal'}: ItemHeaderProps) {
    return (
        <div className={`item-header item-header--${variant}`.trimEnd()}>
			{image !== undefined && (
				<ImageWithFallback src={image} alt={imageAlt}/>
			)}

			<h3>{title}</h3>

			{description && (
				<p>{description}</p>
			)}
		</div>
	);
}
