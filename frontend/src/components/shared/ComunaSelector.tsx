import { useId } from 'react';
import { LuChevronDown, LuMapPin } from 'react-icons/lu';
import { useCart } from '../../context/CartContext';
import { COMUNAS } from '../../constants/constants';
import { Button } from '../core/Button';

export function ComunaSelector() {
    const { deliveryComuna, setDeliveryComuna } = useCart();
    const selectorId = useId();
    return <div className="addresses">
        <Button variant="icon" className="addresses-trigger" type="button" popoverTarget={selectorId}>
            <LuMapPin aria-hidden="true" />
            <span>
                {deliveryComuna === null ? 'Elegí tu comuna' : <>
                    Comuna {deliveryComuna}<span className="addresses-region">, CABA</span>
                </>}
            </span>
            <LuChevronDown className="addresses-chevron" aria-hidden="true" />
        </Button>
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
    </div>;
}
