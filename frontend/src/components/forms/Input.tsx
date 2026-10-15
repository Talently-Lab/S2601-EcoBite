import { useId } from 'react';
import { FormError } from './FormError';

interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: "text" | "login" | "search-bar" | "search-icon";
    icon?: React.ReactNode;
    label?: React.ReactNode;
    error?: React.ReactNode;
    hint?: React.ReactNode;
}

export function Input({
    variant = "text", autoComplete = 'off', icon, label, error, hint, id, className = '',
    'aria-describedby': describedBy, 'aria-invalid': invalid, ...props
}: InputProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionIds = [describedBy, hint && `${inputId}-hint`, error && `${inputId}-error`]
        .filter(Boolean).join(' ') || undefined;

    return (
        <div className="input-field">
            {label && <label className="input-label" htmlFor={inputId}>{label}</label>}
            <div className="input-wrapper">
                <input
                    {...props}
                    className={`input--${variant} ${className}`.trimEnd()}
                    id={inputId}
                    autoComplete={autoComplete}
                    aria-invalid={error ? true : invalid}
                    aria-describedby={descriptionIds}
                />
                {icon && <span className="input-icon">{icon}</span>}
            </div>
            {hint && <p id={`${inputId}-hint`} className="input-hint">{hint}</p>}
            {error && <FormError id={`${inputId}-error`} className="input-error">{error}</FormError>}
        </div>
    );
}
