export function GreenBadge({ icon, text, amount }: { icon: React.ReactNode, text: string, amount?: string }) {
    return (
        <div className="green-badge">
            <div className="green-badge-content">
                <span className="green-badge-icon">{icon}</span>
                <span>{text}</span>
            </div>
            <span className="green-badge-amount">{amount}</span>
        </div>
    );
}
