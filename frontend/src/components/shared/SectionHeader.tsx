type SectionHeaderProps = {
    variant: 'h1' | 'h2';
    title: string;
    subtitle?: string;
    titleId?: string;
    className?: string;
};

export function SectionHeader({ variant: Heading, title, subtitle, titleId, className= '' }: SectionHeaderProps) {
    return (
        <header className={`section-header ${className}`}>
            <Heading id={titleId}>{title}</Heading>
            {subtitle && <p>{subtitle}</p>}
        </header>
    );
}
