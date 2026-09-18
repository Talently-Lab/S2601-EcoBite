interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "outlined";
}

export function Input({ variant = "default", ...props }: InputProps) {
  return null
}
