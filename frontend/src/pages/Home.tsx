import { GreenBadge } from '../components/shared/GreenBadge';
import { TbLeaf } from "react-icons/tb";
import { IoSearch } from "react-icons/io5";
import { Input } from '../components/forms/Input';
import { Button } from '../components/core/Button';
import { SlArrowDown } from "react-icons/sl";
import { Link } from 'react-router';

export function Home() {
    return (
        <div className="page">
            <div className='addresses'>
                <p>Ubicación</p>
                <Button variant='icon'><SlArrowDown /></Button>
            </div>
            <Input placeholder="Buscar restaurante..." type="text" variant="search-bar" name="search-bar" icon={<IoSearch />} />
            <GreenBadge icon={<TbLeaf />} text="Packaging ecológico" />

            <Link to='/restaurants' className='restaurant-link'>
                <span className="nav-item-label">Catálogo de restaurantes</span>
            </Link>
        </div>
    );
}
