interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  price?: number;
}

export function Button({variant = "primary", className = "", price, ...props }: ButtonProps) {
  return (
    <button
      className={`button button--${variant} ${className}`}
      {...props}
    />
  );
}
