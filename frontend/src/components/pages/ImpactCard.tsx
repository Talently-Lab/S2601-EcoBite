type ImpactCardProps = {
    icon: React.ReactNode;
    amount: number;
    description: string;
    variant?: "big" | "small";
};

export function ImpactCard({ icon, amount, description, variant }: ImpactCardProps) {
    return (
        <article className={`impact-card impact-card--${variant}`}>
            <div className="impact-icon">
                {icon}
            </div>
            <div className="impact-content">
                <h3>{amount}</h3>
                <p>{description}</p>
            </div>
        </article>
    );
}
