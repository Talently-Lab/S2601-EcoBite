type ItemHeaderProps = {
  title: string;
  description?: string;
  image?: string;
};

export function ItemHeader({
  title,
  description,
  image
}: ItemHeaderProps) {
  return (
    <div className="item-header">
      {image && (
        <img src={image} alt={title} />
      )}

      <h3>{title}</h3>

      {description && (
        <p>{description}</p>
      )}
    </div>
  );
}
