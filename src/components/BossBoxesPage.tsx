import { useMemo } from "react";
import { boxOpeningSamples } from "../data/bossBoxObservations";
import { itemById } from "../data/items";
import { bossBoxes } from "../data/items/boxes";
import { formatGold } from "../lib/format";
import { buildBossBoxStats } from "../lib/bossBoxes";
import type { PriceMap } from "../types/domain";
import { ItemIcon } from "./ItemIcon";

interface BossBoxesPageProps {
  prices: PriceMap;
  onPriceChange: (next: PriceMap) => void;
}

export function BossBoxesPage({ prices, onPriceChange }: BossBoxesPageProps) {
  const statsByBoxId = useMemo(() => {
    const stats = buildBossBoxStats(boxOpeningSamples, prices);
    return Object.fromEntries(stats.map((entry) => [entry.boxItemId, entry]));
  }, [prices]);

  function updateBoxPrice(boxItemId: number, rawValue: string) {
    const normalized = rawValue.replace(/\s/g, "");
    const parsed = normalized === "" ? null : Number(normalized);
    onPriceChange({
      ...prices,
      [boxItemId]: Number.isFinite(parsed) ? parsed : null,
    });
  }

  return (
    <section className="boss-boxes-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Boss ládák</p>
          <h2>Drop valószínűségek és átlagos income</h2>
          <p className="helper-copy">
            A nyers felnyitási adatokból számolt valószínűségek és várható
            ládaértékek.
          </p>
        </div>
        <span className="muted">Minták száma: {boxOpeningSamples.length}</span>
      </div>

      <div className="boss-box-grid">
        {bossBoxes.map((box) => {
          const boxStats = statsByBoxId[box.id];
          const boxPrice = prices[box.id] ?? null;
          const expectedIncome = boxStats?.expectedIncome ?? 0;
          const averageProfit =
            boxPrice == null ? null : expectedIncome - (boxPrice ?? 0);

          return (
            <article className="panel boss-box-card" key={box.id}>
              <div className="boss-box-header">
                <div>
                  <h3>
                    <ItemIcon itemId={box.id} name={box.name} size={18} /> {" "}
                    {box.name}
                  </h3>
                  <p className="muted">Tárgy azonosító: {box.id}</p>
                </div>
                <label className="price-field box-price-input">
                  <span>Láda piaci ár</span>
                  <div className="input-with-suffix">
                    <input
                      inputMode="numeric"
                      placeholder="pl. 250000000"
                      value={boxPrice ?? ""}
                      onChange={(event) =>
                        updateBoxPrice(box.id, event.target.value)
                      }
                    />
                    <span>Arany</span>
                  </div>
                </label>
              </div>

              <div className="boss-metrics">
                <div>
                  <span>Felnyitások száma</span>
                  <strong>{boxStats?.totalOpens ?? 0}</strong>
                </div>
                <div>
                  <span>Átlagos ládaérték</span>
                  <strong>{formatGold(expectedIncome)}</strong>
                </div>
                <div>
                  <span>Átlagos income</span>
                  <strong>
                    {averageProfit == null
                      ? "Add meg a láda árát"
                      : formatGold(averageProfit)}
                  </strong>
                </div>
              </div>

              {boxStats && boxStats.drops.length > 0 ? (
                <div className="boss-drop-list">
                  {boxStats.drops.map((drop) => (
                    <div className="boss-drop-row" key={`${box.id}-${drop.itemId}`}>
                      <div className="drop-name">
                        <ItemIcon
                          itemId={drop.itemId}
                          name={drop.itemName}
                          size={16}
                        />
                        <span>{drop.itemName}</span>
                      </div>
                      <div className="drop-values">
                        <span>{(drop.dropProbability * 100).toFixed(1)}%</span>
                        <span>
                          átlag: {drop.avgQuantityPerOpen.toFixed(2)} db / nyitás
                        </span>
                        <span>
                          hozzájárulás: {formatGold(drop.expectedIncomeContribution)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  Ehhez a ládához még nincs rögzítve felnyitási minta.
                </div>
              )}
            </article>
          );
        })}
      </div>

      <footer className="boss-note">
        Tipp: minél több nyers felnyitási mintát adsz hozzá, annál pontosabbak
        lesznek a valószínűségek és az átlagos értékek.
      </footer>
    </section>
  );
}
