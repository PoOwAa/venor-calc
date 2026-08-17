import { useEffect, useMemo, useState } from "react";
import { PriceEditor } from "./components/PriceEditor";
import { PathView } from "./components/PathView";
import { items } from "./data/items";
import { formatGold } from "./lib/format";
import { optimize } from "./lib/optimizer";
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
  const [targetItem, setTargetItem] = useState(50259);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
  }, [prices]);

  const results = useMemo(
    () => optimize(targetItem, Math.max(1, quantity), prices),
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
            {results[0]
              ? formatGold(results[0].effectiveCost)
              : "Nincs számolható útvonal"}
          </strong>
        </div>
      </header>

      <PriceEditor prices={prices} onChange={setPrices} />

      <section className="panel target-panel">
        <div>
          <p className="eyebrow">Cél</p>
          <h2>Mit szeretnél megszerezni?</h2>
        </div>
        <div className="target-controls">
          <select
            value={targetItem}
            onChange={(event) => setTargetItem(parseInt(event.target.value))}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value) || 1)}
          />
        </div>
      </section>

      <section className="results-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Optimizer</p>
            <h2>Legjobb útvonalak</h2>
          </div>
          <span className="muted">Effective cost szerint rendezve</span>
        </div>

        {results.length === 0 ? (
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
                    <h3>{result.sourceLabel}</h3>
                  </div>
                  {index === 0 ? (
                    <span className="best-label">LEGOLCSÓBB</span>
                  ) : null}
                </div>
                <div className="metrics">
                  <div>
                    <span>Cash required</span>
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
