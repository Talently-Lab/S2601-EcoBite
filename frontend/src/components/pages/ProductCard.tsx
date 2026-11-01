import type { CartItem, CartProduct } from '../../types/types';
import { Price } from '../core/Price';
import { ItemHeader } from '../shared/ItemHeader';
import { QuantitySelector } from '../forms/QuantitySelector';
import platePlaceholder from '../../assets/icons/plate_placeholder.svg';
import { centsToPrice, getSubtotalCents } from '../../utils/price';

type ProductCardProps =
    | { variant?: 'menu'; product: CartProduct; disabled?: boolean }
    | { variant: 'cart'; product: CartItem; disabled?: boolean };

export function ProductCard(props: ProductCardProps) {
    const { product, disabled = false } = props;
    const variant = props.variant ?? 'menu';
    const selectorInImage = variant === 'menu';
    const price = centsToPrice(getSubtotalCents(product.unitPriceCents, 'quantity' in product ? product.quantity : 1));

    return (
        <article className={`product-card product-card--${variant}`}>
            <div className="product-details">
                <ItemHeader title={product.name} />
                <span>
                    {!selectorInImage && <span className="sr-only">Subtotal: </span>}
                    <Price price={price} />
                </span>
            </div>
            <div className="product-card-image">
                <img src={platePlaceholder} alt="" />
                {selectorInImage && <QuantitySelector product={product} disabled={disabled} />}
            </div>
            {!selectorInImage && <QuantitySelector product={product} disabled={disabled} />}
        </article>
    );
}
