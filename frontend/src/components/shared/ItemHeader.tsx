import { ImageWithFallback } from './ImageWithFallback';

type ItemHeaderProps = {
	title: string;
	description?: string;
	image?: string;
    variant?: 'horizontal' | 'vertical';
};

export function ItemHeader({title, description, image, variant = 'horizontal'}: ItemHeaderProps) {
    return (
        <div className={`item-header item-header--${variant}`}>
			{image !== undefined && (
				<ImageWithFallback src={image} alt={title}/>
			)}

			<h3>{title}</h3>

			{description && (
				<p>{description}</p>
			)}
		</div>
	);
}
