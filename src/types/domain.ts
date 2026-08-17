export type ItemId = string;

export interface Item {
  id: ItemId;
  name: string;
  tradable: boolean;
  category?: string;
}

export interface RecipeIngredient {
  itemId: ItemId;
  quantity: number;
}

export interface RecipeOutput {
  itemId: ItemId;
  quantity: number;
}

export interface Recipe {
  id: string;
  npc: string;
  label: string;
  inputs: RecipeIngredient[];
  output: RecipeOutput;
  goldCost: number;
}

export type PriceMap = Record<ItemId, number | null>;

export interface PathStep {
  type: "market" | "recipe";
  itemId: ItemId;
  quantity: number;
  unitCost?: number;
  recipeId?: string;
  npc?: string;
  goldCost?: number;
  children?: PathStep[];
}

export interface OptimizationResult {
  itemId: ItemId;
  requestedQuantity: number;
  producedQuantity: number;
  cashCost: number;
  effectiveCost: number;
  leftoverValue: number;
  step: PathStep;
  sourceLabel: string;
}
