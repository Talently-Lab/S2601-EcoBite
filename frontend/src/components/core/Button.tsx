import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { useUser } from '../../context/UserContext';
import { useLogout } from '../../hooks/useLogout';

type ButtonProps = {
    variant?: 'primary' | 'icon' | 'link' | 'text';
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

type LogoutButtonProps = {
    icon?: ReactNode;
    errorClassName?: string;
};

export function LogoutButton({ icon, errorClassName }: LogoutButtonProps) {
    const { logout } = useUser();
    const { isLoggingOut, logoutError, handleLogout } = useLogout(logout);

    return <>
        <Button variant="text" disabled={isLoggingOut} onClick={handleLogout}>
            {icon}{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
        {logoutError && <p role="alert" className={errorClassName}>{logoutError}</p>}
    </>;
}
