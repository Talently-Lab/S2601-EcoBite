import { ItemHeader } from "../shared/ItemHeader";
import { ImageWithFallback } from '../shared/ImageWithFallback';
import { Price } from '../core/Price';
import { QuantitySelector } from '../forms/QuantitySelector';
import type { CartItem as CartItemData } from '../../types/types';

type CartItemProps = {
    item: CartItemData;
    onRemove: () => void;
    onQuantityChange: (quantity: number) => void;
    disabled?: boolean;
};

export function CartItem({ item, onRemove, onQuantityChange, disabled = false }: CartItemProps) {

    return (
        <article className="cart-item">
            <ImageWithFallback src={item.image} alt={item.name} />
            <div className="product-details">
                <ItemHeader title={item.name} />
                <span><span className="sr-only">Subtotal: </span><Price price={item.unitPriceCents * item.quantity / 100} /></span>
            </div>
            <QuantitySelector variant="counter" value={item.quantity} onChange={onQuantityChange}
                onRemove={onRemove} label={item.name} disabled={disabled} />
        </article>
    );
}
