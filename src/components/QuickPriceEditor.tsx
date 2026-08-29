import { useState } from "react";
import { formatGoldInput } from "../lib/format";
import { ItemAutocomplete } from "./ItemAutocomplete";
import { itemById } from "../data/items";
import type { ItemId, PriceMap } from "../types/domain";

interface Props {
  prices: PriceMap;
  onChange: (next: PriceMap) => void;
}

export function QuickPriceEditor({ prices, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);

  const selectedItem =
    selectedItemId == null ? null : (itemById[selectedItemId] ?? null);

  const currentPrice =
    selectedItemId == null
      ? null
      : (prices[selectedItemId] ?? selectedItem?.shop_buy_price ?? null);

  function updateSelectedPrice(rawValue: string) {
    if (selectedItemId == null) return;

    const normalized = rawValue.replace(/[\s.]/g, "");
    const parsed = normalized === "" ? null : Number(normalized);
    if (!Number.isFinite(parsed)) return;

    onChange({ ...prices, [selectedItemId]: parsed });
  }

  function resetSelectedPrice() {
    if (selectedItemId == null) return;

    const next = { ...prices };
    delete next[selectedItemId];
    onChange(next);
  }

  return (
    <aside
      className={`quick-price-panel ${isOpen ? "open" : ""}`}
      aria-label="Gyors ár szerkesztő"
    >
      <div className="quick-price-shell">
        <button
          type="button"
          className="quick-price-toggle"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls="quick-price-drawer"
        >
          <span>ÁRAZÓ</span>
        </button>

        <div id="quick-price-drawer" className="quick-price-drawer">
          <div className="quick-price-header">
            <div>
              <p className="eyebrow">Gyors ár szerkesztés</p>
              <h3>Piaci ár módosítás</h3>
            </div>
            <button
              type="button"
              className="secondary quick-price-close"
              onClick={() => setIsOpen(false)}
              aria-label="Ár szerkesztő bezárása"
            >
              ×
            </button>
          </div>

          <div className="quick-price-form">
            <ItemAutocomplete
              selectedItemId={selectedItemId}
              onSelect={setSelectedItemId}
              placeholder="Keresés tárgy alapján"
            />

            {selectedItem ? (
              <>
                <div className="quick-price-meta">
                  <span>Jelenlegi piaci ár</span>
                  <strong>
                    {formatGoldInput(
                      currentPrice ?? selectedItem.shop_buy_price ?? 0,
                    )}{" "}
                    Arany
                  </strong>
                </div>

                <label className="price-field quick-price-field">
                  <span>Ár</span>
                  <div className="input-with-suffix">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="pl. 80 000 000"
                      value={
                        currentPrice == null
                          ? ""
                          : formatGoldInput(currentPrice)
                      }
                      onChange={(event) =>
                        updateSelectedPrice(event.target.value)
                      }
                    />
                    <span>Arany</span>
                  </div>
                </label>

                <div className="quick-price-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={resetSelectedPrice}
                  >
                    Alapár visszaállítása
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state quick-price-empty">
                Válassz ki egy tárgyat az ár frissítéséhez.
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
