export function Price({ price }: { price: number }) {
  return (
    <span className="price">
      ${price.toFixed(2)}
    </span>
  );
}
