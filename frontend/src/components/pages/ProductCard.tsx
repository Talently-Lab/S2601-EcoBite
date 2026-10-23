import type { CartItem, CartProduct } from '../../types/types';
import { Price } from '../core/Price';
import { ItemHeader } from '../shared/ItemHeader';
import { QuantitySelector } from '../forms/QuantitySelector';
import platePlaceholder from '../../assets/icons/plate_placeholder.svg';

type ProductCardProps =
    | { variant?: 'menu'; product: CartProduct; disabled?: boolean }
    | { variant: 'cart'; product: CartItem; disabled?: boolean };

const VARIANT_CONFIG = {
    menu: { showDescription: true, selectorInImage: true },
    cart: { showDescription: false, selectorInImage: false },
} as const;

export function ProductCard(props: ProductCardProps) {
    const { product, disabled = false } = props;
    const variant = props.variant ?? 'menu';
    const config = VARIANT_CONFIG[variant];
    const price = product.unitPriceCents * ('quantity' in product ? product.quantity : 1) / 100;

    return (
        <article className={`product-card product-card--${variant}`}>
            <div className="product-details">
                <ItemHeader title={product.name} description={config.showDescription ? product.description : undefined} />
                <span>
                    {!config.showDescription && <span className="sr-only">Subtotal: </span>}
                    <Price price={price} />
                </span>
            </div>
            <div className="product-card-image">
                <img src={platePlaceholder} alt="" />
                {config.selectorInImage && <QuantitySelector product={product} disabled={disabled} />}
            </div>
            {!config.selectorInImage && <QuantitySelector product={product} disabled={disabled} />}
        </article>
    );
}
