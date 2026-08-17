import { useState } from "react";

interface ItemIconProps {
  itemId: number;
  name: string;
  size?: number;
  className?: string;
}

export function ItemIcon({
  itemId,
  name,
  size = 20,
  className,
}: ItemIconProps) {
  const [hasError, setHasError] = useState(false);

  const src = `${import.meta.env.BASE_URL}items/${itemId}.png`;

  if (hasError) {
    return (
      <div
        className={className}
        title={name}
        aria-label={name}
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      className={className}
      onError={() => setHasError(true)}
      style={{
        objectFit: "contain",
      }}
    />
  );
}
