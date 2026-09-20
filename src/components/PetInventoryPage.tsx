import { useEffect, useMemo, useState } from "react";
import { getItemDisplayName } from "../lib/itemName";
import { getItemApplyBoons } from "../lib/itemApplies";
import type { Item } from "../types/domain";
import { ItemIcon } from "./ItemIcon";
import { TextAutocomplete } from "./TextAutocomplete";

const PET_OWNERSHIP_STORAGE_KEY = "venor-calc-owned-pets-v1";

interface PetInventoryPageProps {
  pets: Item[];
}

interface PetEntry {
  pet: Item;
  name: string;
  boons: ReturnType<typeof getItemApplyBoons>;
  boonSearchTerms: string[];
}

function normalizeTextForSearch(value: string): string {
  return value.trim().toLocaleLowerCase("hu-HU");
}

function toApplySearchTerm(boonLabel: string): string {
  return boonLabel
    .replace(/[+\-]?\d+(?:[.,]\d+)?%?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const [showOwnedPets, setShowOwnedPets] = useState(true);
  const [petNameQuery, setPetNameQuery] = useState("");
  const [applyQuery, setApplyQuery] = useState("");

  const petEntries = useMemo<PetEntry[]>(
    () =>
      pets.map((pet) => {
        const boons = getItemApplyBoons(pet);
        return {
          pet,
          boons,
          name: getItemDisplayName(pet),
          boonSearchTerms: boons.map((boon) => toApplySearchTerm(boon.label)),
        };
      }),
    [pets],
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

  const petNameSuggestions = useMemo(
    () =>
      Array.from(new Set(petEntries.map((entry) => entry.name))).sort((a, b) =>
        a.localeCompare(b, "hu"),
      ),
    [petEntries],
  );

  const applySuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          petEntries
            .flatMap((entry) => entry.boonSearchTerms)
            .filter((term) => term.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b, "hu")),
    [petEntries],
  );

  const filteredEntries = useMemo(() => {
    const normalizedNameQuery = normalizeTextForSearch(petNameQuery);
    const normalizedApplyQuery = normalizeTextForSearch(applyQuery);

    return petEntries.filter((entry) => {
      const isOwned = ownedPetIds.has(entry.pet.vnum);
      if (!showOwnedPets && isOwned) {
        return false;
      }

      if (normalizedNameQuery) {
        const matchesName = normalizeTextForSearch(entry.name).includes(
          normalizedNameQuery,
        );
        if (!matchesName) {
          return false;
        }
      }

      if (normalizedApplyQuery) {
        const matchesApply = entry.boons.some((boon, index) => {
          const normalizedLabel = normalizeTextForSearch(boon.label);
          const normalizedSearchTerm = normalizeTextForSearch(
            entry.boonSearchTerms[index] ?? "",
          );
          return (
            normalizedLabel.includes(normalizedApplyQuery) ||
            normalizedSearchTerm.includes(normalizedApplyQuery)
          );
        });

        if (!matchesApply) {
          return false;
        }
      }

      return true;
    });
  }, [petEntries, ownedPetIds, showOwnedPets, petNameQuery, applyQuery]);

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
          {filteredEntries.length} találat · {ownedCount}/{pets.length}{" "}
          megszerezve
        </span>
      </div>

      <div className="panel pet-inventory-filter-panel">
        <div className="pet-inventory-filter-grid">
          <label className="preference-toggle pet-inventory-owned-toggle">
            <input
              type="checkbox"
              checked={showOwnedPets}
              onChange={(event) => setShowOwnedPets(event.target.checked)}
            />
            <span>Megszerzettek mutatása</span>
          </label>

          <label className="price-field">
            <span>Pet keresése</span>
            <TextAutocomplete
              value={petNameQuery}
              onValueChange={setPetNameQuery}
              suggestions={petNameSuggestions}
              placeholder="pl. Azika"
              ariaLabel="Pet keresése"
            />
          </label>

          <label className="price-field">
            <span>Bónusz keresése</span>
            <TextAutocomplete
              value={applyQuery}
              onValueChange={setApplyQuery}
              suggestions={applySuggestions}
              placeholder="pl. Állatok elleni erő"
              ariaLabel="Bónusz keresése"
            />
          </label>
        </div>
      </div>

      <div className="panel pet-inventory-panel">
        {filteredEntries.length === 0 ? (
          <div className="empty-state">Nincs találat a megadott szűrőkre.</div>
        ) : (
          <div className="pet-inventory-grid">
            {filteredEntries.map((entry) => {
              const { pet, name, boons } = entry;
              const isOwned = ownedPetIds.has(pet.vnum);

              return (
                <label
                  key={pet.vnum}
                  className={`pet-inventory-card ${isOwned ? "owned" : ""}`}
                >
                  <span className="pet-inventory-header">
                    <span className="pet-inventory-icon-wrap">
                      <ItemIcon itemId={pet.vnum} name={name} size={32} />
                    </span>
                    <span className="pet-inventory-name">{name}</span>
                    <input
                      type="checkbox"
                      checked={isOwned}
                      onChange={() => toggleOwned(pet.vnum)}
                      aria-label={`${name} megszerezve`}
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
        )}
      </div>
    </section>
  );
}
