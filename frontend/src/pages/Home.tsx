import { useId } from 'react';
import { IoSearch } from "react-icons/io5";
import { Input } from '../components/forms/Input';
import { Button } from '../components/core/Button';
import { LuChevronDown, LuMapPin } from 'react-icons/lu';
import { LuArrowRight } from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { COMUNAS } from '../constants/constants';
import { ImpactCard } from '../components/pages/ImpactCard';
import { impactMock } from '../mocks/impact';
import { getUserNamePresentation } from '../utils/userName';

export function Home() {
    const { deliveryComuna, setDeliveryComuna } = useCart();
    const { user } = useUser();
    const { firstName } = getUserNamePresentation(user?.name);
    const selectorId = useId();

    return (
        <div className="page home-page">
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
            <div className="home-intro stack">
                <div className="home-greeting stack page-heading">
                    <h1>Hola, {firstName}</h1>
                    <p>¿Qué pedimos hoy?</p>
                </div>
                <ImpactCard variant="home" co2SavedG={impactMock.co2SavedG} />
            </div>
            <Button to="/restaurants" className="home-catalog-link">
                <span>Ver catálogo de restaurantes</span>
                <LuArrowRight aria-hidden="true" />
            </Button>
        </div>
    );
}
