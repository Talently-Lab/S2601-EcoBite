import { useId } from 'react';
import { AiOutlineDelete, AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';
import type { CartProduct } from '../../types/types';
import { useCart } from '../../context/CartContext';
import { Button } from '../core/Button';
import { formatCount } from '../../utils/kpiFormatters';

type Selection = { quantity: number; onChange: (quantity: number) => void };
type QuantitySelectorProps = { product: CartProduct; disabled?: boolean; selection?: Selection };

function QuantityCounter({ product, quantity, disabled, selection }: QuantitySelectorProps & { quantity: number }) {
    const { setQuantity, removeFromCart } = useCart();
    const quantityId = useId();
    const isLastItem = quantity === 1 && !selection;

    return (
        <fieldset className="quantity-selector quantity-selector--counter">
            <legend className="sr-only">Cantidad de {product.name}</legend>
            <Button type="button" variant="icon" disabled={disabled || Boolean(selection && quantity === 1)}
                onClick={() => selection ? selection.onChange(quantity - 1) : isLastItem
                    ? removeFromCart(product.id, product.restaurantId) : setQuantity(product.id, product.restaurantId, quantity - 1)}
                aria-label={isLastItem ? `Eliminar ${product.name}` : `Reducir cantidad de ${product.name}`}>
                {isLastItem ? <AiOutlineDelete aria-hidden="true" /> : <AiOutlineMinus aria-hidden="true" />}
            </Button>
            <label className="sr-only" htmlFor={quantityId}>Cantidad actual</label>
            <output id={quantityId} aria-live={selection ? 'polite' : undefined}>{selection ? quantity : formatCount(quantity)}</output>
            <Button type="button" variant="icon" disabled={disabled || !Number.isSafeInteger(quantity + 1)}
                onClick={() => selection ? selection.onChange(quantity + 1)
                    : setQuantity(product.id, product.restaurantId, quantity + 1)}
                aria-label={`Aumentar cantidad de ${product.name}`}>
                <AiOutlinePlus aria-hidden="true" />
            </Button>
        </fieldset>
    );
}

export function QuantitySelector({ product, disabled = false, selection }: QuantitySelectorProps) {
    const { items, isSubmitting, addToCart } = useCart();
    const controlsDisabled = disabled || (!selection && isSubmitting);

    const quantity = selection?.quantity
        ?? items.find((item) => item.id === product.id && item.restaurantId === product.restaurantId)?.quantity;

    return quantity === undefined
        ? <Button type="button" variant="icon" className="quantity-selector quantity-selector--icon"
            disabled={controlsDisabled} onClick={() => addToCart(product)} aria-label={`Agregar ${product.name} al carrito`}>
            <AiOutlinePlus aria-hidden="true" />
        </Button>
        : <QuantityCounter product={product} quantity={quantity} selection={selection} disabled={controlsDisabled} />;
}
