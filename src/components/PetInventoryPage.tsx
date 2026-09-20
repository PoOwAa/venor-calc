import { useEffect, useMemo, useState } from "react";
import { getItemDisplayName } from "../lib/itemName";
import { getItemApplyBoons } from "../lib/itemApplies";
import type { Item } from "../types/domain";
import { ItemIcon } from "./ItemIcon";

const PET_OWNERSHIP_STORAGE_KEY = "venor-calc-owned-pets-v1";

interface PetInventoryPageProps {
  pets: Item[];
}

function loadOwnedPetsFromStorage(): Set<number> {
  const raw = localStorage.getItem(PET_OWNERSHIP_STORAGE_KEY);
  if (!raw) return new Set<number>();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<number>();

    return new Set(
      parsed
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    );
  } catch {
    return new Set<number>();
  }
}

export function PetInventoryPage({ pets }: PetInventoryPageProps) {
  const [ownedPetIds, setOwnedPetIds] = useState<Set<number>>(() =>
    loadOwnedPetsFromStorage(),
  );

  useEffect(() => {
    localStorage.setItem(
      PET_OWNERSHIP_STORAGE_KEY,
      JSON.stringify(Array.from(ownedPetIds)),
    );
  }, [ownedPetIds]);

  const ownedCount = useMemo(() => {
    let count = 0;
    for (const pet of pets) {
      if (ownedPetIds.has(pet.vnum)) {
        count += 1;
      }
    }
    return count;
  }, [pets, ownedPetIds]);

  function toggleOwned(petId: number) {
    setOwnedPetIds((current) => {
      const next = new Set(current);
      if (next.has(petId)) {
        next.delete(petId);
      } else {
        next.add(petId);
      }
      return next;
    });
  }

  return (
    <section className="pet-inventory-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pet leltár</p>
          <h2>Összes elérhető pet</h2>
          <p className="helper-copy">
            Jelöld be, ha már megszerezted az adott petet.
          </p>
        </div>
        <span className="muted">
          {ownedCount}/{pets.length} megszerezve
        </span>
      </div>

      <div className="panel pet-inventory-panel">
        <div className="pet-inventory-grid">
          {pets.map((pet) => {
            const isOwned = ownedPetIds.has(pet.vnum);
            const boons = getItemApplyBoons(pet);

            return (
              <label
                key={pet.vnum}
                className={`pet-inventory-card ${isOwned ? "owned" : ""}`}
              >
                <span className="pet-inventory-header">
                  <span className="pet-inventory-icon-wrap">
                    <ItemIcon
                      itemId={pet.vnum}
                      name={getItemDisplayName(pet)}
                      size={32}
                    />
                  </span>
                  <span className="pet-inventory-name">
                    {getItemDisplayName(pet)}
                  </span>
                  <input
                    type="checkbox"
                    checked={isOwned}
                    onChange={() => toggleOwned(pet.vnum)}
                    aria-label={`${getItemDisplayName(pet)} megszerezve`}
                  />
                </span>

                {boons.length > 0 ? (
                  <ul className="pet-inventory-boons">
                    {boons.map((boon) => (
                      <li key={boon.key}>{boon.label}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="pet-inventory-empty">Nincs ismert bónusz.</p>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
