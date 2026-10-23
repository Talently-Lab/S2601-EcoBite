import { useId } from 'react';
import { AiOutlineDelete, AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';
import type { CartProduct } from '../../types/types';
import { useCart } from '../../context/CartContext';
import { Button } from '../core/Button';

type QuantitySelectorProps = { product: CartProduct; disabled?: boolean };

function AddButton({ product, disabled }: QuantitySelectorProps) {
    const { addToCart } = useCart();

    return (
        <Button type="button" variant="icon" className="quantity-selector quantity-selector--icon"
            disabled={disabled} onClick={() => addToCart(product)} aria-label={`Agregar ${product.name} al carrito`}>
            <AiOutlinePlus aria-hidden="true" />
        </Button>
    );
}

function QuantityCounter({ product, quantity, disabled }: QuantitySelectorProps & { quantity: number }) {
    const { setQuantity, removeFromCart } = useCart();
    const quantityId = useId();
    const isLastItem = quantity === 1;

    return (
        <fieldset className="quantity-selector quantity-selector--counter">
            <legend className="sr-only">Cantidad de {product.name}</legend>
            <Button type="button" variant="icon" disabled={disabled}
                onClick={() => isLastItem
                    ? removeFromCart(product.id, product.restaurantId)
                    : setQuantity(product.id, product.restaurantId, quantity - 1)}
                aria-label={isLastItem ? `Eliminar ${product.name}` : `Reducir cantidad de ${product.name}`}>
                {isLastItem ? <AiOutlineDelete aria-hidden="true" /> : <AiOutlineMinus aria-hidden="true" />}
            </Button>
            <label className="sr-only" htmlFor={quantityId}>Cantidad actual</label>
            <output id={quantityId}>{quantity}</output>
            <Button type="button" variant="icon" disabled={disabled || !Number.isSafeInteger(quantity + 1)}
                onClick={() => setQuantity(product.id, product.restaurantId, quantity + 1)}
                aria-label={`Aumentar cantidad de ${product.name}`}>
                <AiOutlinePlus aria-hidden="true" />
            </Button>
        </fieldset>
    );
}

export function QuantitySelector({ product, disabled = false }: QuantitySelectorProps) {
    const { items, isSubmitting } = useCart();
    const quantity = items.find((item) => item.id === product.id && item.restaurantId === product.restaurantId)?.quantity;
    const controlsDisabled = disabled || isSubmitting;

    return quantity === undefined
        ? <AddButton product={product} disabled={controlsDisabled} />
        : <QuantityCounter product={product} quantity={quantity} disabled={controlsDisabled} />;
}
