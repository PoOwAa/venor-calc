import { APPLY_LABELS } from "../data/apply-labels";
import type { Item } from "../types/domain";

export interface ItemApplyBoon {
  key: string;
  type: string;
  value: number;
  label: string;
}

function getApplyType(item: Item, slot: 0 | 1 | 2 | 3): string | undefined {
  switch (slot) {
    case 0:
      return item.apply_type0;
    case 1:
      return item.apply_type1;
    case 2:
      return item.apply_type2;
    default:
      return item.apply_type3;
  }
}

function getApplyValue(item: Item, slot: 0 | 1 | 2 | 3): number {
  switch (slot) {
    case 0:
      return item.apply_value0 ?? 0;
    case 1:
      return item.apply_value1 ?? 0;
    case 2:
      return item.apply_value2 ?? 0;
    default:
      return item.apply_value3 ?? 0;
  }
}

function formatApplyLabel(template: string, value: number): string {
  let usedPlaceholder = false;

  const formatted = template.replace(
    /%(\.\d+)?([dfs])/g,
    (_match, precision: string | undefined, specifier: string) => {
      usedPlaceholder = true;

      if (specifier === "s") {
        return String(value);
      }

      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return String(value);
      }

      if (specifier === "f") {
        const decimals = precision ? Number(precision.slice(1)) : 0;
        return numericValue.toFixed(Number.isFinite(decimals) ? decimals : 0);
      }

      return String(Math.trunc(numericValue));
    },
  );

  if (usedPlaceholder || value === 0) {
    return formatted;
  }

  return `${formatted} ${value}`;
}

export function getItemApplyBoons(item: Item): ItemApplyBoon[] {
  const boons: ItemApplyBoon[] = [];

  for (const slot of [0, 1, 2, 3] as const) {
    const applyType = getApplyType(item, slot);
    if (!applyType || applyType === "APPLY_NONE") {
      continue;
    }

    const applyValue = getApplyValue(item, slot);
    const template = APPLY_LABELS[applyType] ?? applyType;

    boons.push({
      key: `${item.vnum}-${slot}-${applyType}`,
      type: applyType,
      value: applyValue,
      label: formatApplyLabel(template, applyValue),
    });
  }

  return boons;
}
