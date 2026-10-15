import { IoAlertCircleOutline } from 'react-icons/io5';

type FormErrorProps = { id: string; className: string; children: React.ReactNode };

export function FormError({ id, className, children }: FormErrorProps) {
    return (
        <p id={id} className={className} role="alert">
            <IoAlertCircleOutline aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}
