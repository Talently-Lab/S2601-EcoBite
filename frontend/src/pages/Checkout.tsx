import { Link, Navigate } from 'react-router';
import { Price } from '../components/core/Price';
import { useCart } from '../context/CartContext';

export function Checkout() {
    const { items, totalCents } = useCart();
    if (!items.length) return <Navigate to="/cart" replace />;

    return (
        <div className="page cart-page">
            <h1 className="page-title">Resumen de compra</h1>
            <h2>{items[0].restaurantName}</h2>
            <ul className="checkout-items">
                {items.map((item) => (
                    <li key={item.id}>
                        {item.quantity} × {item.name}: <Price price={item.unitPriceCents * item.quantity / 100} />
                    </li>
                ))}
            </ul>
            <p>Total estimado: <Price price={totalCents / 100} /></p>
            <p>La confirmación de compra estará disponible próximamente. Todavía no se creó ningún pedido.</p>
            <Link to="/cart">Volver al carrito</Link>
        </div>
    );
}
