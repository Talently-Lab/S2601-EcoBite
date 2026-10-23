import { Link, type LinkProps } from 'react-router';

type ButtonProps = {
    variant?: 'primary' | 'icon';
    className?: string;
} & (
    | (React.ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined })
    | (Omit<LinkProps, 'className'> & { to: LinkProps['to'] })
);

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
    const classes = `button button--${variant} ${className}`.trimEnd();

    if (props.to !== undefined) {
        return <Link {...props} className={classes} />;
    }

    return <button type="button" {...props} className={classes} />;
}