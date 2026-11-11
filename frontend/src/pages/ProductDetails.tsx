import { useLayoutEffect, useState } from 'react';
import { useParams } from 'react-router';
import { TbLeaf } from 'react-icons/tb';
import { Button } from '../components/core/Button';
import { QuantitySelector } from '../components/forms/QuantitySelector';
import { PageHeader } from '../components/core/PageHeader';
import { Price } from '../components/core/Price';
import { Breadcrumbs } from '../components/layouts/Breadcrumbs';
import { GreenBadge } from '../components/shared/GreenBadge';
import { OtherRestaurantNotice, StatusMessage } from '../components/shared/StatusMessage';
import { useCart } from '../context/CartContext';
import { useRestaurants } from '../hooks/useRestaurants';
import type { CartProduct, Restaurant } from '../types/types';
import { centsToPrice, getSubtotalCents, priceToCents } from '../utils/price';
import platePlaceholder from '../assets/icons/plate_placeholder.svg';

const PRODUCT_MESSAGES = {
    loadingTarget: 'plato',
    error: 'No se pudo cargar el plato.',
    empty: 'No encontramos ese plato.',
};

type ProductDetailsContentProps = {
    restaurant: Restaurant;
    product: Restaurant['products'][number];
    unitPriceCents: number;
};

function ProductDetailsContent({ restaurant, product, unitPriceCents }: ProductDetailsContentProps) {
    const [quantity, setQuantity] = useState(1);
    const { addToCart, canAdd, hasOtherRestaurant } = useCart();
    const restaurantTo = `/restaurants/${encodeURIComponent(restaurant.id)}`;
    const selectedSubtotalCents = getSubtotalCents(unitPriceCents, quantity);
    const cartProduct: CartProduct = {
        id: product.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        name: product.name,
        unitPriceCents,
    };

    return <>
        <Breadcrumbs currentPage={product.name} parents={[
            { label: 'Restaurantes', to: '/restaurants' },
            { label: restaurant.name, to: restaurantTo },
        ]} />
        <div className="product-details-layout">
            <div className="product-details-visual">
                <img src={platePlaceholder} alt="" />
                <PageHeader backTo={restaurantTo} backLabel={`Volver a ${restaurant.name}`} mobileOnly />
            </div>
            <section className="product-details-info" aria-labelledby="product-details-title">
                <h2 id="product-details-title" role="heading" aria-level={1}>{product.name}</h2>
                <p className="product-details-restaurant">{restaurant.name}</p>
                <h1 className="product-details-price" role="presentation">
                    <Price price={centsToPrice(unitPriceCents)} />
                </h1>
                {restaurant.packagingType === 'BIODEGRADABLE' && <GreenBadge icon={<TbLeaf aria-hidden="true" />}
                    text="Viene en envase compostable: menos residuos." />}
                {hasOtherRestaurant(restaurant.id) && <OtherRestaurantNotice />}
                <div className="product-details-actions">
                    <QuantitySelector product={cartProduct} selection={{ quantity, onChange: setQuantity }} />
                    <Button disabled={!canAdd(cartProduct, quantity)}
                        onClick={() => addToCart(cartProduct, quantity)}
                        aria-label={`Agregar ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} de ${product.name} al carrito`}>
                        <span>Agregar</span>
                        <Price price={centsToPrice(selectedSubtotalCents)} />
                    </Button>
                </div>
            </section>
        </div>
    </>;
}

export function ProductDetails() {
    const { id, productId } = useParams();

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [id, productId]);

    const { restaurants, status } = useRestaurants();
    const restaurant = status === 'ready' ? restaurants.find((item) => item.id === id) : undefined;
    const product = restaurant?.products.find((item) => item.id === productId);
    const unitPriceCents = product ? priceToCents(product.price) : null;

    return (
        <div className="page product-details-page">
            {restaurant && product && unitPriceCents !== null
                ? <ProductDetailsContent key={`${restaurant.id}:${product.id}`} restaurant={restaurant}
                    product={product} unitPriceCents={unitPriceCents} />
                : <StatusMessage status={status} isEmpty messages={PRODUCT_MESSAGES} />}
        </div>
    );
}
