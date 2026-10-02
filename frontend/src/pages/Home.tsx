import { GreenBadge } from '../components/shared/GreenBadge';
import { TbLeaf } from "react-icons/tb";
import { IoSearch } from "react-icons/io5";
import { Input } from '../components/forms/Input';
import { Button } from '../components/core/Button';
import { SlArrowDown } from "react-icons/sl";
import { Link } from 'react-router';
import { FaArrowRight } from "react-icons/fa6";

export function Home() {
    return (
        <div className="page">
            <div className='addresses'>
                <p>Ubicación</p>
                <Button variant='icon'><SlArrowDown /></Button>
            </div>
            <Input placeholder="Buscar restaurante..." type="text" variant="search-bar" name="search-bar" icon={<IoSearch />} />
            <GreenBadge icon={<TbLeaf />} text="Packaging ecológico" />
            <Button>
                <Link to='/restaurants' className='restaurant-link'>
                    <span className="nav-item-label">Ver catálogo de restaurantes</span>
                    <FaArrowRight />
                </Link>
            </Button>
        </div>
    );
}
