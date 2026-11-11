import { Button } from '../components/core/Button';
import { PageHeader } from '../components/core/PageHeader';
import { ProductCard } from '../components/pages/ProductCard';
import { Price } from '../components/core/Price';
import { GreenBadge } from '../components/shared/GreenBadge';
import { SectionHeader } from '../components/shared/SectionHeader';
import { useCart } from '../context/CartContext';
import { FiInfo } from 'react-icons/fi';
import emptyCartIllustration from '../assets/icons/empty-cart.svg';
import { centsToPrice } from '../utils/price';

export function Cart() {
    const { items, totalCents } = useCart();
    const restaurant = items[0];
    const restaurantTo = restaurant
        ? `/restaurants/${encodeURIComponent(restaurant.restaurantId)}`
        : '/restaurants';
    const backLabel = restaurant ? `Volver a ${restaurant.restaurantName}` : 'Volver a restaurantes';

    return (
        <div className={`page cart-page${restaurant ? '' : ' cart-page--empty'}`}>
            <PageHeader title="Tu carrito" backTo={restaurantTo} backLabel={backLabel} />
            {restaurant ? (
                <>
                    <SectionHeader variant="h1" title="Tu carrito" className="sr-only" />
                    <div className="cart-content">
                        <div className="cart-items">
                            <div className="cart-restaurant-heading">
                                <SectionHeader variant="h2" title={restaurant.restaurantName} />
                                <Button variant="link" to={restaurantTo}>Agregar más</Button>
                            </div>
                            <section className="cart-products" aria-label={`Productos de ${restaurant.restaurantName}`}>
                                {items.map((item) => <ProductCard key={item.id} variant="cart" product={item} />)}
                            </section>
                        </div>
                        <aside className="cart-bottom surface-card" aria-labelledby="cart-summary-title">
                            <SectionHeader variant="h2" title="Resumen" titleId="cart-summary-title" className="sr-only" />
                            <GreenBadge icon={<FiInfo aria-hidden="true" />} text={<><strong>Con tu pedido en bici evitás emisiones de CO2.</strong> Lo verás al confirmar.</>}/>
                            <div className="cart-summary" aria-live="polite">
                                <span>Total</span><Price price={centsToPrice(totalCents)} />
                            </div>
                            <Button to="/checkout">Ir a pagar</Button>
                        </aside>
                    </div>
                </>
            ) : (
                <>
                    <section className="empty-cart surface-card" aria-labelledby="empty-cart-title">
                        <img className="empty-cart-illustration" src={emptyCartIllustration} alt="" />
                        <h1 id="empty-cart-title">Tu carrito está vacío</h1>
                        <div className="empty-cart-message">
                            <p>¿Qué pedimos hoy?<br />Hay restaurantes friendly cerca tuyo.</p>
                            <p><strong>Cada pedido suma</strong></p>
                        </div>
                        <div className="state-actions">
                            <Button to="/restaurants">Explorar restaurantes</Button>
                            <Button variant="link" to="/">Volver a inicio</Button>
                        </div>
                    </section>
                    <Button type="button" disabled>Ir a pagar</Button>
                </>
            )}
        </div>
    );
}
