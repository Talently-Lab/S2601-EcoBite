interface NavbarProps {
  navItems?: { label: string; icon: React.ReactNode }[];
}

export function Navbar({ navItems }: NavbarProps) {
  return (
    <ul className="navbar">
      {navItems?.map((item, index) => (
        <li className="nav-item" key={index}>
          <span className="nav-item-icon">{item.icon}</span>
          <span className="nav-item-label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
