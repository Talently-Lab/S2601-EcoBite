import { SearchBar } from '../components/forms/SearchBar';
import { Button } from '../components/core/Button';
import { LuArrowRight } from 'react-icons/lu';
import { useUser } from '../context/UserContext';
import { RESTAURANTS_MESSAGES } from '../constants/constants';
import { ComunaSelector } from '../components/shared/ComunaSelector';
import { ImpactCard } from '../components/pages/ImpactCard';
import { getUserNamePresentation } from '../utils/userName';
import { RestaurantCard } from '../components/pages/RestaurantCard';
import { StatusMessage } from '../components/shared/StatusMessage';
import { SectionHeader } from '../components/shared/SectionHeader';
import { useRestaurants } from '../hooks/useRestaurants';

export function Home() {
    const { user } = useUser();
    const { firstName } = getUserNamePresentation(user?.name);
    const { restaurants, status } = useRestaurants();
    const featuredRestaurants = restaurants.slice(0, 8);

    return (
        <div className="page home-page">
            <ComunaSelector />
            <SearchBar variant="bar" />
            <div className="home-intro stack">
                <SectionHeader variant="h1" title={`Hola, ${firstName}`} subtitle="¿Qué pedimos hoy?" />
                <ImpactCard variant="home" />
            </div>
            <section className="home-featured" aria-labelledby="home-featured-title">
                <div className="home-featured-heading">
                    <h3 id="home-featured-title">Destacados</h3>
                    <Button variant="link" to="/restaurants">Ver todos</Button>
                </div>
                <StatusMessage status={status} isEmpty={restaurants.length === 0}
                    messages={RESTAURANTS_MESSAGES} />
                {status !== 'loading' && featuredRestaurants.length > 0 && (
                    <div className="home-featured-list">
                        {featuredRestaurants.map((restaurant) => (
                            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                        ))}
                    </div>
                )}
            </section>
            <Button to="/restaurants">
                <span>Ver catálogo de restaurantes</span>
                <LuArrowRight aria-hidden="true" />
            </Button>
        </div>
    );
}
