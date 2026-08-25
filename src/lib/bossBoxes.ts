import { itemById } from "../data/items";
import type { PriceMap } from "../types/domain";
import type { BoxOpeningSample } from "../data/bossBoxObservations";

export interface BossBoxDropStats {
  itemId: number;
  itemName: string;
  dropCount: number;
  totalQuantity: number;
  unitPrice: number;
  dropProbability: number;
  avgQuantityPerDrop: number;
  avgQuantityPerOpen: number;
  expectedIncomeContribution: number;
}

export interface BossBoxStats {
  boxItemId: number;
  totalOpens: number;
  expectedIncome: number;
  drops: BossBoxDropStats[];
}

export function buildBossBoxStats(
  samples: BoxOpeningSample[],
  prices: PriceMap,
): BossBoxStats[] {
  const groupedByBox = new Map<number, BoxOpeningSample[]>();

  for (const sample of samples) {
    const current = groupedByBox.get(sample.boxItemId) ?? [];
    current.push(sample);
    groupedByBox.set(sample.boxItemId, current);
  }

  return Array.from(groupedByBox.entries())
    .map(([boxItemId, boxSamples]) => {
      const totalOpens = boxSamples.reduce(
        (sum, sample) => sum + (sample.openedBoxCount ?? 1),
        0,
      );
      const dropMap = new Map<
        number,
        { dropCount: number; totalQuantity: number }
      >();

      for (const sample of boxSamples) {
        const seenInOpen = new Set<number>();

        for (const drop of sample.drops) {
          const current = dropMap.get(drop.itemId) ?? {
            dropCount: 0,
            totalQuantity: 0,
          };

          current.totalQuantity += drop.quantity;
          if (!seenInOpen.has(drop.itemId)) {
            current.dropCount += 1;
            seenInOpen.add(drop.itemId);
          }

          dropMap.set(drop.itemId, current);
        }
      }

      const drops: BossBoxDropStats[] = Array.from(dropMap.entries()).map(
        ([itemId, aggregate]) => {
          const fallbackPrice = itemById[itemId]?.shop_buy_price ?? 0;
          const unitPrice = prices[itemId] ?? fallbackPrice;
          const dropProbability =
            totalOpens === 0 ? 0 : aggregate.dropCount / totalOpens;
          const avgQuantityPerDrop =
            aggregate.dropCount === 0
              ? 0
              : aggregate.totalQuantity / aggregate.dropCount;
          const avgQuantityPerOpen =
            totalOpens === 0 ? 0 : aggregate.totalQuantity / totalOpens;
          const expectedIncomeContribution = avgQuantityPerOpen * unitPrice;

          return {
            itemId,
            itemName:
              itemById[itemId]?.locale_name ??
              itemById[itemId]?.name ??
              `Ismeretlen tárgy (${itemId})`,
            dropCount: aggregate.dropCount,
            totalQuantity: aggregate.totalQuantity,
            unitPrice,
            dropProbability,
            avgQuantityPerDrop,
            avgQuantityPerOpen,
            expectedIncomeContribution,
          };
        },
      );

      drops.sort(
        (a, b) => b.expectedIncomeContribution - a.expectedIncomeContribution,
      );

      const expectedIncome = drops.reduce(
        (sum, drop) => sum + drop.expectedIncomeContribution,
        0,
      );

      return {
        boxItemId,
        totalOpens,
        expectedIncome,
        drops,
      };
    })
    .sort((a, b) => b.expectedIncome - a.expectedIncome);
}
