export function formatGold(value: number): string {
  return (
    new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(
      Math.round(value),
    ) + " Arany"
  );
}

export function formatGoldInput(value: number): string {
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}
