import { useEffect, useMemo, useState } from "react";
import type { BoxOpeningSample } from "../data/bossBoxObservations";
import { items } from "../data/items";
import { formatGold } from "../lib/format";
import { buildBossBoxStats } from "../lib/bossBoxes";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";
import type { PriceMap } from "../types/domain";
import { ItemIcon } from "./ItemIcon";

interface BossBoxesPageProps {
  prices: PriceMap;
  onPriceChange: (next: PriceMap) => void;
}

interface ApprovedBoxOpeningRow {
  box_item_id: number;
  opened_box_count: number | null;
  approved_entries: Array<{
    item_id?: number | null;
    quantity?: number | string | null;
  }>;
}

export function BossBoxesPage({ prices, onPriceChange }: BossBoxesPageProps) {
  const bossBoxes = useMemo(
    () =>
      items.filter(
        (item) => item.type === "ITEM_GIFTBOX" || item.type === "ITEM_GACHA",
      ),
    [],
  );

  const [boxOpeningSamples, setBoxOpeningSamples] = useState<
    BoxOpeningSample[]
  >([]);
  const [supabaseDataError, setSupabaseDataError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;

    async function loadApprovedSamples() {
      if (!isSupabaseConfigured()) {
        if (!ignore) {
          setBoxOpeningSamples([]);
          setSupabaseDataError(
            "A Supabase konfiguráció hiányzik. Add meg a VITE_SUPABASE_URL és VITE_SUPABASE_ANON_KEY értékeket.",
          );
        }
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("box_opening_approved")
          .select("*");

        if (error) throw error;

        const samples = normalizeApprovedRowsToSamples(
          (data ?? []) as ApprovedBoxOpeningRow[],
        );

        if (!ignore) {
          setBoxOpeningSamples(samples);
          setSupabaseDataError(null);
        }
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setBoxOpeningSamples([]);
          setSupabaseDataError(
            "Nem sikerült betölteni a jóváhagyott láda nyitási adatokat a Supabase-ből.",
          );
        }
      }
    }

    void loadApprovedSamples();

    return () => {
      ignore = true;
    };
  }, []);

  const statsByBoxId = useMemo(() => {
    const stats = buildBossBoxStats(boxOpeningSamples, prices);
    return Object.fromEntries(stats.map((entry) => [entry.boxItemId, entry]));
  }, [boxOpeningSamples, prices]);

  const totalOpenedBoxes = useMemo(
    () =>
      boxOpeningSamples.reduce(
        (sum, sample) => sum + (sample.openedBoxCount ?? 1),
        0,
      ),
    [boxOpeningSamples],
  );

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
          <h2>Drop valószínűségek és átlagos bevétel</h2>
          <p className="helper-copy">
            A jóváhagyott Supabase adatokból számolt valószínűségek és várható
            ládaértékek.
          </p>
        </div>
        <span className="muted">
          Felnyitott boxok száma: {totalOpenedBoxes}
        </span>
      </div>

      {supabaseDataError ? (
        <p className="ocr-error">{supabaseDataError}</p>
      ) : null}

      <div className="boss-box-grid">
        {bossBoxes.map((box) => {
          const boxStats = statsByBoxId[box.vnum];
          const boxPrice = prices[box.vnum] ?? null;
          const expectedIncome = boxStats?.expectedIncome ?? 0;
          const averageProfit =
            boxPrice == null ? null : expectedIncome - (boxPrice ?? 0);

          return (
            <article className="panel boss-box-card" key={box.vnum}>
              <div className="boss-box-header">
                <div>
                  <h3>
                    <ItemIcon
                      itemId={box.vnum}
                      name={box.locale_name || box.name}
                      size={18}
                    />{" "}
                    {box.locale_name || box.name}
                  </h3>
                  <p className="muted">Tárgy azonosító: {box.vnum}</p>
                </div>
                <label className="price-field box-price-input">
                  <span>Láda piaci ár</span>
                  <div className="input-with-suffix">
                    <input
                      inputMode="numeric"
                      placeholder="pl. 250000000"
                      value={boxPrice ?? ""}
                      onChange={(event) =>
                        updateBoxPrice(box.vnum, event.target.value)
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
                    <div
                      className="boss-drop-row"
                      key={`${box.vnum}-${drop.itemId}`}
                    >
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
                          átlag: {drop.avgQuantityPerOpen.toFixed(2)} db /
                          nyitás
                        </span>
                        <span>
                          hozzájárulás:{" "}
                          {formatGold(drop.expectedIncomeContribution)}
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

function normalizeApprovedRowsToSamples(
  rows: ApprovedBoxOpeningRow[],
): BoxOpeningSample[] {
  return rows.flatMap((row) => {
    const boxItemId = Number(row.box_item_id);
    const openedBoxCount = Number(row.opened_box_count ?? 1);

    if (!Number.isFinite(boxItemId) || boxItemId <= 0) {
      return [];
    }

    const drops = (row.approved_entries ?? [])
      .map((entry) => {
        const itemId = Number(entry.item_id ?? NaN);
        const quantity = Number(entry.quantity ?? 0);

        if (
          !Number.isFinite(itemId) ||
          itemId <= 0 ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          return null;
        }

        return { itemId, quantity };
      })
      .filter(
        (drop): drop is { itemId: number; quantity: number } => drop != null,
      );

    if (drops.length === 0) {
      return [];
    }

    return [
      {
        boxItemId,
        openedBoxCount:
          Number.isFinite(openedBoxCount) && openedBoxCount > 0
            ? openedBoxCount
            : 1,
        drops,
      },
    ];
  });
}
