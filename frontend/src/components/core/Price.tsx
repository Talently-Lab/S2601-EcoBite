export function Price({ price }: { price: number }) {
    return (
        <span className="price">
            ${price.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
        </span>
    );
}
