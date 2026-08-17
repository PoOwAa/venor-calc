import { useEffect, useMemo, useState } from "react";
import { ItemAutocomplete } from "./components/ItemAutocomplete";
import { ItemIcon } from "./components/ItemIcon";
import { PriceEditor } from "./components/PriceEditor";
import { PathView } from "./components/PathView";
import { itemById } from "./data/items";
import { formatGold } from "./lib/format";
import { getRelevantTradableItems, optimize } from "./lib/optimizer";
import type { PriceMap } from "./types/domain";

const STORAGE_KEY = "venor-calc-prices-v1";

const defaultPrices: PriceMap = {
  50255: 10_000_000,
  50256: 20_000_000,
  50257: 60_000_000,
  50258: 170_000_000,
  25042: 300_000_000,
  230042: 400_000_000,
};

export default function App() {
  const [prices, setPrices] = useState<PriceMap>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultPrices;
    try {
      return JSON.parse(stored);
    } catch {
      return defaultPrices;
    }
  });
  const [targetItem, setTargetItem] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selectedTarget = targetItem == null ? null : itemById[targetItem];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
  }, [prices]);

  const relevantTradableItems = useMemo(
    () => (targetItem == null ? [] : getRelevantTradableItems(targetItem)),
    [targetItem],
  );

  const results = useMemo(
    () =>
      targetItem == null
        ? []
        : optimize(targetItem, Math.max(1, quantity), prices),
    [targetItem, quantity, prices],
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <span className="brand-mark">VC</span>
          <p className="eyebrow">Venor2 conversion optimizer</p>
          <h1>VenorCalc</h1>
          <p className="hero-copy">
            Találd meg a legolcsóbb utat tárgyak, event tokenek és NPC receptek
            között.
          </p>
        </div>
        <div className="hero-stat">
          <span>Legjobb ár</span>
          <strong>
            {selectedTarget == null
              ? "Válassz egy tárgyat"
              : results[0]
              ? formatGold(results[0].effectiveCost)
              : "Nincs számolható útvonal"}
          </strong>
        </div>
      </header>

      <section className="panel target-panel">
        <div>
          <p className="eyebrow">Cél</p>
          <h2>Mit szeretnél megszerezni?</h2>
          <p className="helper-copy">
            Először válaszd ki a kívánt tárgyat, utána csak a hozzá tartozó
            receptekhez szükséges piaci ármezők jelennek meg.
          </p>
        </div>
        <div className="target-controls">
          <div className="target-search">
            <ItemAutocomplete
              selectedItemId={targetItem}
              onSelect={setTargetItem}
            />
            {selectedTarget ? (
              <div className="target-summary">
                <span className="target-badge">
                  <ItemIcon
                    itemId={selectedTarget.id}
                    name={selectedTarget.name}
                    size={18}
                  />{" "}
                  {selectedTarget.name}
                </span>
                <span className="target-badge subtle">
                  {relevantTradableItems.length} releváns piaci tárgy
                </span>
              </div>
            ) : null}
          </div>

          <label className="price-field">
            <span>Mennyiség</span>
            <input
              type="number"
              min={1}
              value={quantity}
              disabled={targetItem == null}
              onChange={(event) => setQuantity(Number(event.target.value) || 1)}
            />
          </label>
        </div>
      </section>

      {selectedTarget ? (
        <PriceEditor
          items={relevantTradableItems}
          targetName={selectedTarget.name}
          prices={prices}
          onChange={setPrices}
        />
      ) : null}

      <section className="results-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Optimizer</p>
            <h2>Legjobb útvonalak</h2>
          </div>
          <span className="muted">Effective cost szerint rendezve</span>
        </div>

        {selectedTarget == null ? (
          <div className="empty-state">
            Válassz ki egy tárgyat a keresőben, hogy megjelenjenek a releváns
            receptek és az ármezők.
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            Adj meg piaci árakat azokhoz az alapanyagokhoz, amelyekből a cél
            előállítható.
          </div>
        ) : (
          <div className="results-grid">
            {results.slice(0, 5).map((result, index) => (
              <article
                className={`result-card ${index === 0 ? "best" : ""}`}
                key={`${result.sourceLabel}-${index}`}
              >
                <div className="result-header">
                  <div>
                    <span className="rank">#{index + 1}</span>
                    <div className="result-item-title">
                      <ItemIcon
                        itemId={result.itemId}
                        name={itemById[result.itemId]?.name ?? result.sourceLabel}
                        size={22}
                      />
                      <h3>{result.sourceLabel}</h3>
                    </div>
                  </div>
                  {index === 0 ? (
                    <span className="best-label">LEGOLCSÓBB</span>
                  ) : null}
                </div>
                <div className="metrics">
                  <div>
                    <span>Szükséges arany</span>
                    <strong>{formatGold(result.cashCost)}</strong>
                  </div>
                  <div>
                    <span>Effective cost</span>
                    <strong>{formatGold(result.effectiveCost)}</strong>
                  </div>
                  <div>
                    <span>Maradék értéke</span>
                    <strong>{formatGold(result.leftoverValue)}</strong>
                  </div>
                </div>
                <details open={index === 0}>
                  <summary>Útvonal részletei</summary>
                  <PathView step={result.step} />
                </details>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        Az árak csak ebben a böngészőben kerülnek mentésre. A receptek a
        repositoryban verziózott statikus adatok.
      </footer>
    </main>
  );
}
