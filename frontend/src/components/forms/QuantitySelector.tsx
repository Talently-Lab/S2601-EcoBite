import { Button } from '../core/Button';
import { AiOutlineDelete, AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';

type QuantitySelectorProps = {
    label: string;
    disabled?: boolean;
} & (
    | { variant: 'icon'; onAdd: () => void }
    | { variant?: 'counter'; value: number; onChange: (value: number) => void; onRemove: () => void }
);

export function QuantitySelector(props: QuantitySelectorProps) {
    const { label, disabled = false } = props;
    if (props.variant === 'icon') {
        return (
            <Button type="button" variant="icon" className="quantity-selector quantity-selector--icon"
                disabled={disabled} onClick={props.onAdd} aria-label={`Agregar ${label} al carrito`}>
                <AiOutlinePlus aria-hidden="true" />
            </Button>
        );
    }

    const { value, onChange, onRemove } = props;
    const isLastItem = value === 1;

    return (
        <div className="quantity-selector quantity-selector--counter" role="group" aria-label={`Cantidad de ${label}`}>
            <Button type="button" variant="icon" disabled={disabled}
                onClick={() => isLastItem ? onRemove() : onChange(value - 1)}
                aria-label={isLastItem ? `Eliminar ${label}` : `Reducir cantidad de ${label}`}>
                {isLastItem ? <AiOutlineDelete aria-hidden="true" /> : <AiOutlineMinus aria-hidden="true" />}
            </Button>
            <output aria-label={`Cantidad de ${label}`}>{value}</output>
            <Button type="button" variant="icon" disabled={disabled || !Number.isSafeInteger(value + 1)}
                onClick={() => onChange(value + 1)} aria-label={`Aumentar cantidad de ${label}`}>
                <AiOutlinePlus aria-hidden="true" />
            </Button>
        </div>
    );
}
