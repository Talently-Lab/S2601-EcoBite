import { useId } from 'react';
import { Button } from '../components/core/Button';
import { PageHeader } from '../components/core/PageHeader';
import { ProductCard } from '../components/pages/ProductCard';
import { Price } from '../components/core/Price';
import { GreenBadge } from '../components/shared/GreenBadge';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router';
import { FiInfo } from 'react-icons/fi';
import emptyCartIllustration from '../assets/icons/empty-cart.svg';

export function Cart() {

    const { items, totalCents } = useCart();
    const navigate = useNavigate();
    const emptyTitleId = useId();

    return (
        <div className={`page cart-page${items.length ? '' : ' cart-page--empty'}`}>
            <PageHeader title={items.length ? 'Tu carrito' : undefined}
                backTo="/restaurants" backLabel="Volver a restaurantes" />
            {items.length ? (
            <>
                <div className="cart-restaurant-heading">
                    <h2>{items[0].restaurantName}</h2>
                    <Link to={`/restaurants/${encodeURIComponent(items[0].restaurantId)}`}>Agregar más</Link>
                </div>
                <section className="cart-products" aria-label={`Productos de ${items[0].restaurantName}`}>
                    {items.map((item) => (
                        <ProductCard key={item.id} variant="cart" product={item} />
                    ))}
                </section>
                <div className="cart-bottom">
                    <GreenBadge icon={<FiInfo aria-hidden="true" />} text="Con este pedido evitás" amount="200g de CO2"
                        description="Calculamos este impacto según la distancia y el transporte de envío."
                        variant="descriptive" />
                    <div className="cart-summary" aria-live="polite">
                        <span>Total</span>
                        <Price price={totalCents / 100} />
                    </div>
                    <Button type="button" onClick={() => navigate('/checkout')}>Ir a pagar</Button>
                </div>
            </>
            ) : (
                <section className="empty-cart surface-card" aria-labelledby={emptyTitleId}>
                    <img className="empty-cart-illustration" src={emptyCartIllustration} alt="" />
                    <h1 id={emptyTitleId}>Tu carrito está vacío</h1>
                    <div className="empty-cart-message">
                        <p>¿Qué pedimos hoy?<br />Hay restaurantes friendly cerca tuyo.</p>
                        <p><strong>Cada pedido suma</strong></p>
                    </div>
                    <div className="state-actions">
                        <Link className="button button--primary" to="/restaurants">Explorar restaurantes</Link>
                        <Link className="home-link" to="/">Volver a inicio</Link>
                    </div>
                </section>
            )}
            {!items.length ? <Button type="button" disabled>Ir a pagar</Button> : null}
        </div>
    );
}
