import { useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type SubmitEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { IoSearch } from 'react-icons/io5';
import { Button } from '../core/Button';
import { Input } from './Input';

type SearchBarProps = {
    variant: 'bar' | 'icon';
};

const SEARCH_LABEL = 'Buscar restaurantes o platos';

export function SearchBar({ variant }: SearchBarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') ?? '';
    const compact = variant === 'icon';
    const [expanded, setExpanded] = useState(false);
    const collapsed = compact && !expanded;
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();

    useEffect(() => {
        if (expanded) inputRef.current?.focus({ preventScroll: true });
    }, [expanded]);

    useEffect(() => {
        if (inputRef.current) inputRef.current.value = query;
    }, [query]);

    function handleExpand(event: MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        setExpanded(true);
    }

    function navigateToSearch(term: string) {
        const params = new URLSearchParams(location.pathname === '/restaurants' ? location.search : '');
        if (term) params.set('q', term);
        else params.delete('q');
        void navigate(`/restaurants${params.size ? `?${params}` : ''}`);
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const term = String(new FormData(event.currentTarget).get('q') ?? '').trim();
        setExpanded(false);
        navigateToSearch(term);
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        if (!event.currentTarget.value && query) navigateToSearch('');
    }

    function handleBlur(event: FocusEvent<HTMLFormElement>) {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
        if (expanded && event.key === 'Escape') {
            setExpanded(false);
            event.currentTarget.querySelector('button')?.focus();
        }
    }

    return <form className={`search-bar search-bar--${variant}`} role="search" onSubmit={handleSubmit}
        onBlur={handleBlur} onKeyDown={handleKeyDown}>
        <Button variant="icon" type="submit"
            aria-label={collapsed ? 'Abrir búsqueda' : 'Buscar'}
            aria-controls={compact ? inputId : undefined} aria-expanded={compact ? expanded : undefined}
            onClick={collapsed ? handleExpand : undefined}>
            <IoSearch aria-hidden="true" />
        </Button>
        <Input ref={inputRef} variant="search" id={inputId} type="search" name="q"
            defaultValue={query} onChange={handleChange} placeholder={SEARCH_LABEL} aria-label={SEARCH_LABEL} />
    </form>;
}
