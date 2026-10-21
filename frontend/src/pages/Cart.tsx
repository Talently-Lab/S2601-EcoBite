import { Button } from '../components/core/Button';
import { CartItem } from '../components/pages/CartItem';
import { Price } from '../components/core/Price';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router';

export function Cart() {

    const { items, totalCents, totalQuantity, removeFromCart, setQuantity } = useCart();
    const navigate = useNavigate();

    return (
        <div className="page cart-page">
            <h1 className="page-title">Tu carrito</h1>
            {items.length ? (
            <>
                <h2>{items[0].restaurantName}</h2>
                {items.map((item) => (
                    <CartItem key={item.id} item={item}
                        onRemove={() => removeFromCart(item.id)}
                        onQuantityChange={(quantity) => setQuantity(item.id, quantity)} />
                ))}
                <div className="cart-summary" aria-live="polite">
                    <p>{totalQuantity} {totalQuantity === 1 ? 'producto' : 'productos'}</p>
                    <p>Total <Price price={totalCents / 100} /></p>
                </div>
            </>
            ) :
            (
                <div className="empty-cart">
                    <p>El carrito está vacío</p>
                    <Link to="/restaurants">Ver restaurantes</Link>
                </div>
            )}
            <Button type="button" disabled={!items.length} onClick={() => navigate('/checkout')}>Ir a pagar</Button>
        </div>
    );
}
