export type ItemId = number;

export interface Item {
  vnum: ItemId;
  name: string;
  locale_name: string;
  type: string;
  sub_type?: string;
  size?: number;
  anti_flags?: string;
  flags?: string;
  wear_flags?: string;
  immune_flags?: string;
  gold?: number;
  shop_buy_price?: number;
  refined_vnum?: number;
  refine_set?: number;
  limit_type0?: string;
  limit_value0?: number;
  limit_type1?: string;
  limit_value1?: number;
  apply_type0?: string;
  apply_value0?: number;
  apply_type1?: string;
  apply_value1?: number;
  apply_type2?: string;
  apply_value2?: number;
  apply_type3?: string;
  apply_value3?: number;
  value0?: number;
  value1?: number;
  value2?: number;
  value3?: number;
  value4?: number;
  value5?: number;
  specular?: number;
  addon_type?: number;
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
