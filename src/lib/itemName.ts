import type { Item } from "../types/domain";

export function getItemDisplayName(item?: Partial<Item> | null): string {
  const raw = item?.locale_name ?? item?.name ?? "";
  return raw.trim() || "Unnamed item";
}

export function getItemNameForSearch(
  item: Partial<Item> | null | undefined,
): string {
  return (item?.locale_name ?? item?.name ?? "").trim();
}
