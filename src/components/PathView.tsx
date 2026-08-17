import { itemById } from "../data/items";
import { recipes } from "../data/recipes";
import { formatGold } from "../lib/format";
import type { PathStep } from "../types/domain";

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
          {step.quantity}× {item?.name}
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
          {step.quantity}× {item?.name}
        </strong>
        <span>{recipe?.label}</span>
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
