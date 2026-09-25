import { Header } from '../components/layouts/Header';
import { CartItem } from '../components/pages/CartItem';
import { GreenBadge } from '../components/shared/GreenBadge';
import { TbLeaf } from "react-icons/tb";

export function Cart() {

    const amount = "0.2 kg";
    const cartItems = [
        { name: 'Sashimi', description: '5 sashimis de salmón', img: '' },
        { name: 'Niguiris', description: '5 sashimis de salmón', img: '' },
        { name: 'Tonkatsu', description: 'Arrox frito, mila de cerdo', img: '' }
    ];

    return (
        <div className="page cart-page">
            <Header title="Tu carrito" />
            {cartItems.map((item) => (
                <CartItem key={item.name} {...item} />
            ))}
            <GreenBadge icon={<TbLeaf />} text="CO2 ahorrado" amount={amount} />
        </div>
    );
}
