import { useId } from 'react';
import { Link, Navigate } from 'react-router';
import { Price } from '../components/core/Price';
import { Button } from '../components/core/Button';
import { PageHeader } from '../components/core/PageHeader';
import { Input } from '../components/forms/Input';
import { FormError } from '../components/forms/FormError';
import { SectionHeader } from '../components/shared/SectionHeader';
import { useCart } from '../context/CartContext';
import { centsToPrice, formatPrice } from '../utils/price';

const paymentOptions = [
    { value: 'card', label: 'Tarjeta' },
    { value: 'cash', label: 'Efectivo' },
] as const;

type CheckoutSummaryProps = {
    titleId: string;
    restaurantName: string;
    productCount: number;
    totalPrice: number;
};

function CheckoutSummary({ titleId, restaurantName, productCount, totalPrice }: CheckoutSummaryProps) {
    return (
        <section className="checkout-summary" aria-labelledby={titleId}>
            <div className="checkout-summary-heading">
                <h3 id={titleId}>{restaurantName}</h3>
                <span className="checkout-product-count">
                    {productCount} {productCount === 1 ? 'producto' : 'productos'}
                </span>
            </div>
            <div className="checkout-total">
                <span>Total</span>
                <Price price={totalPrice} />
            </div>
        </section>
    );
}

type ConfirmOrderActionProps = {
    isSubmitting: boolean;
    disabled: boolean;
    totalPrice: number;
    onConfirm: () => void;
};

function ConfirmOrderAction({ isSubmitting, disabled, totalPrice, onConfirm }: ConfirmOrderActionProps) {
    return (
        <div className="checkout-submit">
            <Button className="checkout-confirm" type="button" disabled={disabled || isSubmitting} aria-busy={isSubmitting}
                onClick={onConfirm}>
                {isSubmitting ? (
                    <>
                        <span className="loading-spinner" aria-hidden="true" />
                        Confirmando tu pedido...
                    </>
                ) : <>
                    Confirmar pedido
                    <span> · {formatPrice(totalPrice)}</span>
                </>}
            </Button>
            {isSubmitting ? (
                <p className="checkout-submit-hint" role="status">Esperá unos segundos. Tu pedido no tarda mucho.</p>
            ) : null}
        </div>
    );
}

export function Checkout() {
    const { items, totalQuantity, totalCents, deliveryComuna, isSubmitting, purchaseError, confirmPurchase } = useCart();
    const totalPrice = centsToPrice(totalCents);
    const checkoutId = useId();
    const deliveryTitleId = `${checkoutId}-delivery`;
    const summaryTitleId = `${checkoutId}-summary`;
    if (!items.length) return <Navigate to="/cart" replace />;

    return (
        <div className="page checkout-page">
            <div className="checkout-heading">
                <PageHeader title="Confirmá tu pedido" backTo="/cart" backLabel="Volver al carrito" />
                <SectionHeader variant="h1" title="Confirmá tu pedido" className="sr-only" />
            </div>

            <div className="checkout-layout">
                <div className="checkout-details">
                    <section className="checkout-address" aria-labelledby={deliveryTitleId}>
                        <SectionHeader variant="h2" title="Dirección de entrega" titleId={deliveryTitleId} />
                        <Input className="checkout-address-input" label="Envío a" value={deliveryComuna === null ? 'Elegí una comuna' : `Comuna ${deliveryComuna}`}
                            readOnly disabled={deliveryComuna !== null} />
                        {deliveryComuna === null && <Link className="checkout-choose-comuna" to="/">Elegir comuna en inicio</Link>}
                    </section>

                    <fieldset className="checkout-payment" disabled={isSubmitting}>
                        <legend className="sr-only">Método de pago</legend>
                        <SectionHeader variant="h2" title="Método de pago" />
                        <div className="checkout-payment-options">
                            {paymentOptions.map(({ value, label }) => (
                                <label className="checkout-payment-option" key={value}>
                                    <input type="radio" name={`${checkoutId}-payment`} value={value} defaultChecked={value === 'card'} />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>

                <div className="checkout-review surface-card">
                    <CheckoutSummary titleId={summaryTitleId} restaurantName={items[0].restaurantName}
                        productCount={totalQuantity} totalPrice={totalPrice} />
                    {purchaseError && <FormError id={`${checkoutId}-error`}>{purchaseError.message}</FormError>}
                    <ConfirmOrderAction isSubmitting={isSubmitting} disabled={deliveryComuna === null}
                        totalPrice={totalPrice} onConfirm={() => void confirmPurchase()} />
                </div>
            </div>
        </div>
    );
}
