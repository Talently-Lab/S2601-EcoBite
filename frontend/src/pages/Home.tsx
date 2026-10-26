import { useId } from 'react';
import { IoSearch } from "react-icons/io5";
import { Input } from '../components/forms/Input';
import { Button } from '../components/core/Button';
import { LuChevronDown, LuMapPin } from 'react-icons/lu';
import { LuArrowRight } from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { COMUNAS } from '../constants/comunas';

export function Home() {
    const { deliveryComuna, setDeliveryComuna } = useCart();
    const selectorId = useId();

    return (
        <div className="page">
            <div className="addresses">
                <button className="addresses-trigger" type="button" popoverTarget={selectorId}>
                    <LuMapPin aria-hidden="true" />
                    <span>{deliveryComuna === null ? 'Elegí tu comuna' : `Comuna ${deliveryComuna}`}</span>
                    <LuChevronDown className="addresses-chevron" aria-hidden="true" />
                </button>
                <div id={selectorId} className="addresses-popover" popover="auto" role="group" aria-label="Comunas de entrega">
                    {COMUNAS.map((comuna) => (
                        <button key={comuna} type="button" className="addresses-option"
                            popoverTarget={selectorId} popoverTargetAction="hide"
                            aria-pressed={deliveryComuna === comuna}
                            onClick={() => setDeliveryComuna(comuna)}>
                            Comuna {comuna}
                        </button>
                    ))}
                </div>
            </div>
            <Input placeholder="Buscar restaurante..." type="text" variant="search-bar" name="search-bar" icon={<IoSearch />} />
            <Button to="/restaurants" className="home-catalog-link">
                <span>Ver catálogo de restaurantes</span>
                <LuArrowRight aria-hidden="true" />
            </Button>
        </div>
    );
}
