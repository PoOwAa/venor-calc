export function getItemIcon(itemId: number): string {
  return `${import.meta.env.BASE_URL}items/${itemId}.png`;
}
