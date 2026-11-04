import { useLocation } from 'react-router';
import { RestaurantCard } from '../components/pages/RestaurantCard';
import { SearchBar } from '../components/forms/SearchBar';
import { FilterChip } from '../components/core/FilterChip';
import { PageHeader } from '../components/core/PageHeader';
import { Breadcrumbs } from '../components/layouts/Breadcrumbs';
import { StatusMessage } from '../components/shared/StatusMessage';
import { useRestaurants } from '../hooks/useRestaurants';
import { FOOD_CATEGORY_LABELS, RESTAURANTS_MESSAGES } from '../constants/constants';
import type { Restaurant } from '../types/types';

function searchable(text: string): string {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-AR');
}

export function Restaurants() {
    const { restaurants, status } = useRestaurants();
    const { pathname, search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const searchTerm = searchable(searchParams.get('q')?.trim() ?? '');
    const requestedCategory = searchParams.get('category') ?? '';
    const category: Restaurant['foodCategory'] | '' = Object.hasOwn(FOOD_CATEGORY_LABELS, requestedCategory)
        ? requestedCategory as Restaurant['foodCategory'] : '';
    const hasFilters = Boolean(searchTerm || category);
    const visibleRestaurants = hasFilters ? restaurants.filter(matchesFilters) : restaurants;

    function matchesFilters(restaurant: Restaurant): boolean {
        return (category === '' || restaurant.foodCategory === category) &&
            (!searchTerm || searchable(restaurant.name).includes(searchTerm) ||
                restaurant.products.some((product) => searchable(product.name).includes(searchTerm)));
    }

    function categoryHref(value: string): string {
        const params = new URLSearchParams(searchParams);
        if (value) params.set('category', value);
        else params.delete('category');
        const queryString = params.toString();
        return `${pathname}${queryString ? `?${queryString}` : ''}`;
    }

    return (
        <div className="page restaurant-page">
            <Breadcrumbs currentPage="Restaurantes" />
            <div className="restaurant-toolbar">
                <PageHeader backTo="/" backLabel="Volver al inicio" mobileOnly />
                <SearchBar variant="icon" />
            </div>
            <h1>Restaurantes</h1>
            <nav className="restaurant-filters" aria-label="Filtrar restaurantes por categoría">
                <FilterChip to={categoryHref('')} selected={category === ''}>Todos</FilterChip>
                {Object.entries(FOOD_CATEGORY_LABELS).map(([value, label]) => (
                    <FilterChip key={value} to={categoryHref(value)} selected={category === value}>{label}</FilterChip>
                ))}
            </nav>
            <StatusMessage status={status} isEmpty={visibleRestaurants.length === 0}
                messages={RESTAURANTS_MESSAGES}
                emptyMessage={hasFilters ? RESTAURANTS_MESSAGES.emptyFiltered : undefined} />
            {status !== 'loading' && visibleRestaurants.map((restaurant) =>
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}
        </div>
    );
}
