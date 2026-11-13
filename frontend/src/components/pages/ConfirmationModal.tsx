import { useEffect, useId, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { Price } from '../core/Price';
import { Button } from '../core/Button';
import confirmationIllustration from '../../assets/icons/confirmation.svg';
import { formatGrams } from '../../utils/kpiFormatters';

const deliveryMessages = {
    BIKE: 'bici.',
    MOTORCYCLE: 'moto.',
    CAR: 'auto.',
};

export function ConfirmationModal() {
    const { createdOrder, closeConfirmationModal } = useCart();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!createdOrder || !dialog) return;
        const previousFocus = document.activeElement;
        dialog.showModal();
        return () => {
            dialog.close();
            queueMicrotask(() => {
                const target = previousFocus instanceof HTMLElement && previousFocus.isConnected
                    && previousFocus !== document.body && !previousFocus.matches(':disabled')
                    ? previousFocus : document.querySelector<HTMLElement>('main');
                target?.focus();
            });
        };
    }, [createdOrder]);

    if (!createdOrder) return null;

    return (
        <dialog ref={dialogRef} className="confirmation-modal" aria-labelledby={titleId} aria-describedby={descriptionId}
            onCancel={(event) => {
                event.preventDefault();
                closeConfirmationModal();
            }}>
            <div className="confirmation-modal-content">
                <img className="confirmation-modal-illustration" src={confirmationIllustration} alt="" />
                <div className="confirmation-modal-heading">
                    <h2 id={titleId}>¡Pedido confirmado!</h2>
                    <p id={descriptionId}>
                        {createdOrder.restaurantName} ya está preparando tu pedido.
                        {createdOrder.deliveryMethod && <><br />{`Te lo llevan en ${deliveryMessages[createdOrder.deliveryMethod]}`}</>}
                    </p>
                </div>
                <div className="confirmation-modal-impact">
                    <p className="confirmation-modal-impact-heading">Tu impacto en este pedido</p>
                    <p className="confirmation-modal-impact-value">
                        {createdOrder.co2SavedG >= 0 ? <>
                            <span>Evitaste</span>
                            <strong>{formatGrams(createdOrder.co2SavedG)} de CO₂</strong>
                        </> : <span>Este pedido no tiene impacto positivo</span>}
                    </p>
                </div>
                <dl className="confirmation-modal-details">
                    <div><dt>Pedido</dt><dd>#{createdOrder.id}</dd></div>
                    <div><dt>Total</dt><dd><Price price={createdOrder.totalAmount} /></dd></div>
                </dl>
                <div className="state-actions">
                    <Button to="/impact" autoFocus onClick={closeConfirmationModal}>Ver tu impacto</Button>
                    <Button variant="link" to="/" onClick={closeConfirmationModal}>Volver a inicio</Button>
                </div>
            </div>
        </dialog>
    );
}
