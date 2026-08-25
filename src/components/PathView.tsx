import { itemById } from "../data/items";
import { recipes } from "../data/recipes";
import { formatGold } from "../lib/format";
import { getItemDisplayName } from "../lib/itemName";
import type { PathStep } from "../types/domain";
import { ItemIcon } from "./ItemIcon";

export function PathView({
  step,
  level = 0,
}: {
  step: PathStep;
  level?: number;
}) {
  const item = itemById[step.itemId];

  if (step.type === "market") {
    return (
      <div className="path-node" style={{ marginLeft: level * 18 }}>
        <span className="path-badge market">Piac</span>
        <strong>
          {step.quantity}×{" "}
          <ItemIcon itemId={step.itemId} name={getItemDisplayName(item)} />{" "}
          {getItemDisplayName(item)}
        </strong>
        <span>{formatGold((step.unitCost ?? 0) * step.quantity)}</span>
      </div>
    );
  }

  const recipe = recipes.find((entry) => entry.id === step.recipeId);

  return (
    <div className="path-group" style={{ marginLeft: level * 18 }}>
      <div className="path-node">
        <span className="path-badge recipe">Recept</span>
        <strong>
          {step.quantity}×{" "}
          <ItemIcon itemId={step.itemId} name={getItemDisplayName(item)} />{" "}
          {getItemDisplayName(item)}
        </strong>
        <span>
          {recipe?.inputs.map((inputItem) => (
            <span key={`${recipe.id}-${inputItem.itemId}`}>
              {inputItem.quantity}x{" "}
              <ItemIcon
                itemId={inputItem.itemId}
                name={getItemDisplayName(itemById[inputItem.itemId])}
              />{" "}
              {getItemDisplayName(itemById[inputItem.itemId])}
            </span>
          ))}
        </span>
        {step.goldCost ? <span>+ {formatGold(step.goldCost)}</span> : null}
      </div>
      <div className="npc">NPC: {step.npc}</div>
      {step.children?.map((child, index) => (
        <PathView
          key={`${child.itemId}-${index}`}
          step={child}
          level={level + 1}
        />
      ))}
    </div>
  );
}
