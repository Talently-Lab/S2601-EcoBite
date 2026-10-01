interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "icon";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
    return (
        <button
            className={`button button--${variant} ${className}`}
            {...props}
        />
    );
}
