type GreenBagdeProps = {
    icon: React.ReactNode,
    text: string,
    amount?: string
    variant?: "descriptive" | "tag" ;
};

export function GreenBadge({ icon, text, amount, variant='descriptive' }: GreenBagdeProps ) {
    return (
        <div className={`green-badge green-badge--${variant}`}>
            <div className="green-badge-content">
                <span className="green-badge-icon">{icon}</span>
                <span>{text}</span>
            </div>
            {amount && <span className="green-badge-amount">{amount}</span>}
        </div>
    );
}
