import { Button } from "../core/Button";

interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: "text" | "search-bar" | "search-icon";
    icon?: React.ReactNode;
}

export function Input({ variant = "text", icon, ...props }: InputProps) {
    return (
        <div className="input-wrapper">
            <input
                className={`input--${variant}`}
                id={props.name}
                autoComplete={props.autoComplete ? props.autoComplete : 'off'}
                {...props}
            />
            {icon && <Button variant='icon' className="icon">{icon}</Button>}
        </div>
    );
}
