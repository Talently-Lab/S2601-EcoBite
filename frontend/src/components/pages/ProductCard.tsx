import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import type { CartProduct } from '../../types/types';
import { Price } from '../core/Price';
import { ItemHeader } from '../shared/ItemHeader';
import { ImageWithFallback } from '../shared/ImageWithFallback';
import { QuantitySelector } from '../forms/QuantitySelector';

type ProductCardProps = { product: CartProduct };

export function ProductCard({ product }: ProductCardProps) {
    const { items, addToCart, setQuantity, removeFromCart } = useCart();
    const cartItem = items.find((item) => item.id === product.id && item.restaurantId === product.restaurantId);
    const [message, setMessage] = useState('');

    function handleAdd() {
        const result = addToCart(product);
        setMessage(result === 'added' ? `${product.name} agregado al carrito.` : 'No se pudo agregar el producto.');
    }

    return (
        <article className="product-card">
            <div className="product-card-details">
                <ItemHeader title={product.name} description={product.description} />
                <Price price={product.unitPriceCents / 100} />
            </div>
            <div className="product-card-image">
                <ImageWithFallback src={product.image} alt={product.name} />
                {cartItem ? (
                    <QuantitySelector variant="counter" label={product.name} value={cartItem.quantity}
                        onChange={(quantity) => {
                            setQuantity(product.id, quantity);
                            setMessage('');
                        }}
                        onRemove={() => {
                            removeFromCart(product.id);
                            setMessage('');
                        }} />
                ) : (
                    <QuantitySelector variant="icon" label={product.name} onAdd={handleAdd} />
                )}
            </div>
            <p className="product-card-status" role="status">{message}</p>
        </article>
    );
}
