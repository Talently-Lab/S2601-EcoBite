type GreenBagdeProps = {
    icon: React.ReactNode,
    text: string,
    amount?: string,
    description?: string,
    variant?: "descriptive" | "tag";
};

export function GreenBadge({ icon, text, amount, description, variant='descriptive' }: GreenBagdeProps ) {
    return (
        <div className={`green-badge green-badge--${variant}`.trimEnd()}>
            <div className="green-badge-content">
                <span className="green-badge-icon">{icon}</span>
                <span>{text}{amount ? <> <strong>{amount}</strong></> : null}</span>
            </div>
            {description ? <p className="green-badge-description">{description}</p> : null}
        </div>
    );
}
