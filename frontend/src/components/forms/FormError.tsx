import { IoAlertCircleOutline } from 'react-icons/io5';

type FormErrorProps = { id: string; children: React.ReactNode };

export function FormError({ id, children }: FormErrorProps) {
    return (
        <p id={id} className="form-error" role="alert">
            <IoAlertCircleOutline aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}
