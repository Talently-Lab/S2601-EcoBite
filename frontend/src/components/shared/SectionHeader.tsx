type SectionHeaderProps = {
    variant: 'h1' | 'h2';
    title: string;
    subtitle?: string;
    titleId?: string;
};

export function SectionHeader({ variant: Heading, title, subtitle, titleId }: SectionHeaderProps) {
    return (
        <header className="section-header">
            <Heading id={titleId}>{title}</Heading>
            {subtitle && <p>{subtitle}</p>}
        </header>
    );
}
