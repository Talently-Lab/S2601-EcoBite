import { Link } from 'react-router';
import { LuHouse, LuUser } from "react-icons/lu";
import { LuShoppingCart } from "react-icons/lu";
import { TbLeaf } from "react-icons/tb";

export function Navbar() {
    const navItems = [
        { route: '/', label: 'Home', icon: <LuHouse /> },
        { route: '/impact', label: 'Impacto', icon: <TbLeaf /> },
        { route: '/cart', label: 'Carrito', icon: <LuShoppingCart /> },
        { route: '/profile', label: 'Perfil', icon: <LuUser /> }
    ];

    return (
        <nav className="navbar">
            {navItems?.map((item, index) => (
                <Link to={item.route} className="nav-item" key={index}>
                    <span className="nav-item-icon">{item.icon}</span>
                    <span className="nav-item-label">{item.label}</span>
                </Link>
            ))}
        </nav>
    );
}
