import { useId } from 'react';
import { Link, Navigate } from 'react-router';
import { Price } from '../components/core/Price';
import { Button } from '../components/core/Button';
import { PageHeader } from '../components/core/PageHeader';
import { Input } from '../components/forms/Input';
import { FormError } from '../components/forms/FormError';
import { useCart } from '../context/CartContext';
import { centsToPrice } from '../utils/price';

type PaymentOptionProps = {
    name: string;
    value: 'card' | 'cash';
    label: string;
    defaultChecked?: boolean;
};

function PaymentOption({ name, value, label, defaultChecked = false }: PaymentOptionProps) {
    return (
        <label className="checkout-payment-option">
            <input type="radio" name={name} value={value} defaultChecked={defaultChecked} />
            {label}
        </label>
    );
}

type CheckoutSummaryProps = {
    titleId: string;
    restaurantName: string;
    productCount: number;
    totalCents: number;
};

function CheckoutSummary({ titleId, restaurantName, productCount, totalCents }: CheckoutSummaryProps) {
    const total = centsToPrice(totalCents);

    return (
        <section className="checkout-summary surface-card" aria-labelledby={titleId}>
            <div className="checkout-summary-heading">
                <h2 id={titleId}>{restaurantName}</h2>
                <span className="checkout-product-count">
                    {productCount} {productCount === 1 ? 'producto' : 'productos'}
                </span>
            </div>
            <div className="checkout-breakdown">
                <div className="checkout-product-total">
                    <span>Producto</span>
                    <Price price={total} />
                </div>
                <div className="checkout-total">
                    <span>Total</span>
                    <Price price={total} />
                </div>
            </div>
        </section>
    );
}

type ConfirmOrderActionProps = {
    isSubmitting: boolean;
    disabled: boolean;
    onConfirm: () => void;
};

function ConfirmOrderAction({ isSubmitting, disabled, onConfirm }: ConfirmOrderActionProps) {
    return (
        <div className="checkout-submit">
            <Button className="checkout-confirm" type="button" disabled={disabled || isSubmitting} aria-busy={isSubmitting}
                onClick={onConfirm}>
                {isSubmitting ? (
                    <>
                        <span className="loading-spinner" aria-hidden="true" />
                        Confirmando tu pedido...
                    </>
                ) : 'Confirmar pedido'}
            </Button>
            {isSubmitting ? (
                <p className="checkout-submit-hint" role="status">Esperá unos segundos. Tu pedido no tarda mucho.</p>
            ) : null}
        </div>
    );
}

export function Checkout() {
    const { items, totalQuantity, totalCents, deliveryComuna, isSubmitting, purchaseError, confirmPurchase } = useCart();
    const checkoutId = useId();
    const deliveryTitleId = `${checkoutId}-delivery`;
    const summaryTitleId = `${checkoutId}-summary`;
    if (!items.length) return <Navigate to="/cart" replace />;

    return (
        <div className="page checkout-page">
            <PageHeader title="Confirmá tu pedido" backTo="/cart" backLabel="Volver al carrito" />

            <section className="checkout-address" aria-labelledby={deliveryTitleId}>
                <h2 id={deliveryTitleId}>Dirección de entrega</h2>
                <Input label="Comuna de entrega" value={deliveryComuna === null ? 'Elegí una comuna' : `Comuna ${deliveryComuna}`} readOnly />
                {deliveryComuna === null && <Link className="checkout-choose-comuna" to="/">Elegir comuna en inicio</Link>}
            </section>

            <fieldset className="checkout-payment" disabled={isSubmitting}>
                <legend>Método de pago</legend>
                <PaymentOption name={`${checkoutId}-payment`} value="card" label="Tarjeta" defaultChecked />
                <PaymentOption name={`${checkoutId}-payment`} value="cash" label="Efectivo" />
            </fieldset>

            <CheckoutSummary titleId={summaryTitleId} restaurantName={items[0].restaurantName}
                productCount={totalQuantity} totalCents={totalCents} />

            {purchaseError && <FormError id={`${checkoutId}-error`} className="input-error">{purchaseError.message}</FormError>}
            <ConfirmOrderAction isSubmitting={isSubmitting} disabled={deliveryComuna === null}
                onConfirm={() => void confirmPurchase()} />
        </div>
    );
}
