import { itemById } from "../data/items";
import { recipes } from "../data/recipes";
import type {
  Item,
  ItemId,
  OptimizationResult,
  PathStep,
  PriceMap,
  Recipe,
} from "../types/domain";

const MAX_DEPTH = 12;
const MAX_RESULTS_PER_ITEM = 8;

function recipesFor(itemId: ItemId): Recipe[] {
  return recipes.filter((recipe) => recipe.output.itemId === itemId);
}

function collectTradableInputs(
  itemId: ItemId,
  visited: Set<ItemId>,
  collected: Set<ItemId>,
) {
  if (visited.has(itemId)) return;
  visited.add(itemId);

  if (itemById[itemId]?.tradable) {
    collected.add(itemId);
  }

  for (const recipe of recipesFor(itemId)) {
    for (const input of recipe.inputs) {
      collectTradableInputs(input.itemId, visited, collected);
    }
  }
}

function marketResult(
  itemId: ItemId,
  quantity: number,
  prices: PriceMap,
): OptimizationResult | null {
  const unitPrice = prices[itemId];
  if (unitPrice == null || unitPrice <= 0) return null;

  const cost = unitPrice * quantity;
  return {
    itemId,
    requestedQuantity: quantity,
    producedQuantity: quantity,
    cashCost: cost,
    effectiveCost: cost,
    leftoverValue: 0,
    sourceLabel: `Piaci vásárlás: ${itemById[itemId]?.name ?? itemId}`,
    step: {
      type: "market",
      itemId,
      quantity,
      unitCost: unitPrice,
    },
  };
}

function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) => {
      const next: T[][] = [];
      for (const prefix of acc) {
        for (const value of group) next.push([...prefix, value]);
      }
      return next;
    },
    [[]],
  );
}

function optimizeInternal(
  itemId: ItemId,
  quantity: number,
  prices: PriceMap,
  stack: Set<ItemId>,
  depth: number,
): OptimizationResult[] {
  if (depth > MAX_DEPTH || stack.has(itemId)) return [];

  const results: OptimizationResult[] = [];
  const directMarket = marketResult(itemId, quantity, prices);
  if (directMarket) results.push(directMarket);

  const nextStack = new Set(stack);
  nextStack.add(itemId);

  for (const recipe of recipesFor(itemId)) {
    const crafts = Math.ceil(quantity / recipe.output.quantity);
    const producedQuantity = crafts * recipe.output.quantity;

    const ingredientOptions = recipe.inputs.map((input) =>
      optimizeInternal(
        input.itemId,
        input.quantity * crafts,
        prices,
        nextStack,
        depth + 1,
      ),
    );

    if (ingredientOptions.some((options) => options.length === 0)) continue;

    for (const combo of cartesian(ingredientOptions)) {
      const ingredientCash = combo.reduce(
        (sum, result) => sum + result.cashCost,
        0,
      );
      const ingredientEffective = combo.reduce(
        (sum, result) => sum + result.effectiveCost,
        0,
      );
      const recipeGold = recipe.goldCost * crafts;

      const excess = producedQuantity - quantity;
      const ownMarketPrice = prices[itemId];
      const leftoverValue =
        ownMarketPrice && ownMarketPrice > 0 ? excess * ownMarketPrice : 0;

      const step: PathStep = {
        type: "recipe",
        itemId,
        quantity: producedQuantity,
        recipeId: recipe.id,
        npc: recipe.npc,
        goldCost: recipeGold,
        children: combo.map((result) => result.step),
      };

      results.push({
        itemId,
        requestedQuantity: quantity,
        producedQuantity,
        cashCost: ingredientCash + recipeGold,
        effectiveCost: ingredientEffective + recipeGold - leftoverValue,
        leftoverValue:
          combo.reduce((sum, result) => sum + result.leftoverValue, 0) +
          leftoverValue,
        sourceLabel: `${recipe.label} (${recipe.npc})`,
        step,
      });
    }
  }

  return results
    .sort(
      (a, b) => a.effectiveCost - b.effectiveCost || a.cashCost - b.cashCost,
    )
    .slice(0, MAX_RESULTS_PER_ITEM);
}

export function optimize(
  itemId: ItemId,
  quantity: number,
  prices: PriceMap,
): OptimizationResult[] {
  return optimizeInternal(itemId, quantity, prices, new Set(), 0);
}

export function getRelevantTradableItems(itemId: ItemId): Item[] {
  const collected = new Set<ItemId>();
  collectTradableInputs(itemId, new Set(), collected);

  return [...collected]
    .map((id) => itemById[id])
    .filter((item): item is Item => item != null)
    .sort(
      (a, b) =>
        (a.category ?? "").localeCompare(b.category ?? "", "hu") ||
        a.name.localeCompare(b.name, "hu") ||
        a.id - b.id,
    );
}
