import { formatPrice } from '../../utils/price';

export function Price({ price }: { price: number }) {
    return (
        <span className="price">
            {formatPrice(price)}
        </span>
    );
}
