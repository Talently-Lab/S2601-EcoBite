interface QuantitySelectorProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "counter" | "icon";
}

export function QuantitySelector({
    variant = "counter",
    className = "",
    ...props
}: QuantitySelectorProps) {
    return (
        <button
            className={`quantity-selector quantity-selector--${variant} ${className}`}
            {...props}
        />
    );
}
