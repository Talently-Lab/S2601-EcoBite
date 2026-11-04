import { Link } from 'react-router';
import type { ReactNode } from 'react';

type FilterChipProps = {
    to: string;
    selected: boolean;
    children: ReactNode;
};

export function FilterChip({ to, selected, children }: FilterChipProps) {
    return <Link className="filter-chip" to={to} aria-current={selected ? 'true' : undefined}>
        {children}
    </Link>;
}
