import { useMemo, useState } from "react";
import { boxOpeningSamples } from "../data/bossBoxObservations";
import { itemById, items } from "../data/items";
import { bossBoxes } from "../data/items/boxes";
import { formatGold } from "../lib/format";
import { buildBossBoxStats } from "../lib/bossBoxes";
import {
  matchDropsToKnownItems,
  normalizeText,
  parseBoxOcrText,
  type MatchedOcrDropLine,
} from "../lib/bossBoxOcr";
import type { PriceMap } from "../types/domain";
import { EditableItemAutocomplete } from "./EditableItemAutocomplete";
import { ItemIcon } from "./ItemIcon";

interface BossBoxesPageProps {
  prices: PriceMap;
  onPriceChange: (next: PriceMap) => void;
}

interface EditableOcrLine {
  id: string;
  recognizedName: string;
  sourceLine: string;
  quantity: number;
  itemNameInput: string;
  matchedItemId: number | null;
  matchedItemName: string | null;
  confidence: number;
  needsReview: boolean;
}

export function BossBoxesPage({ prices, onPriceChange }: BossBoxesPageProps) {
  const [ocrText, setOcrText] = useState("");
  const [ocrLines, setOcrLines] = useState<EditableOcrLine[]>([]);
  const [ocrOpenedBoxCount, setOcrOpenedBoxCount] = useState<number | null>(
    null,
  );
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const statsByBoxId = useMemo(() => {
    const stats = buildBossBoxStats(boxOpeningSamples, prices);
    return Object.fromEntries(stats.map((entry) => [entry.boxItemId, entry]));
  }, [prices]);

  const reviewCount = ocrLines.filter((entry) => entry.needsReview).length;

  function updateBoxPrice(boxItemId: number, rawValue: string) {
    const normalized = rawValue.replace(/\s/g, "");
    const parsed = normalized === "" ? null : Number(normalized);
    onPriceChange({
      ...prices,
      [boxItemId]: Number.isFinite(parsed) ? parsed : null,
    });
  }

  async function handleOcrFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrRunning(true);
    setOcrError(null);
    setOcrProgress(0);

    try {
      const tesseract = await import("tesseract.js");
      const result = await tesseract.recognize(file, "hun+eng", {
        logger: (message: { status?: string; progress?: number }) => {
          if (typeof message.progress === "number") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });

      const text = result.data.text;
      setOcrText(text);

      const parsed = parseBoxOcrText(text);
      setOcrOpenedBoxCount(parsed.openedBoxCount);
      const matched = matchDropsToKnownItems(parsed.drops);
      setOcrLines(toEditableOcrLines(matched));
    } catch (error) {
      setOcrError(
        "Az OCR feldolgozás sikertelen volt. Próbáld újra egy tisztább képpel.",
      );
      setOcrText("");
      setOcrOpenedBoxCount(null);
      setOcrLines([]);
      console.error(error);
    } finally {
      setIsOcrRunning(false);
      event.target.value = "";
    }
  }

  function updateOcrItemName(lineId: string, value: string) {
    setOcrLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;

        const exactMatch = findExactItemByName(value);
        if (exactMatch) {
          return {
            ...line,
            itemNameInput: value,
            matchedItemId: exactMatch.id,
            matchedItemName: exactMatch.name,
            confidence: 1,
            needsReview: false,
          };
        }

        const [fuzzyMatch] = matchDropsToKnownItems([
          {
            rawName: value,
            quantity: line.quantity,
            sourceLine: line.sourceLine,
          },
        ]);

        return {
          ...line,
          itemNameInput: value,
          matchedItemId: fuzzyMatch?.matchedItemId ?? null,
          matchedItemName: fuzzyMatch?.matchedItemName ?? null,
          confidence: fuzzyMatch?.confidence ?? 0,
          needsReview: fuzzyMatch?.needsReview ?? true,
        };
      }),
    );
  }

  function updateOcrQuantity(lineId: string, rawValue: string) {
    const parsed = Number(rawValue);
    setOcrLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              quantity: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
            }
          : line,
      ),
    );
  }

  function applyOcrItemSelection(
    lineId: string,
    itemId: number,
    itemName: string,
  ) {
    setOcrLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              itemNameInput: itemName,
              matchedItemId: itemId,
              matchedItemName: itemName,
              confidence: 1,
              needsReview: false,
            }
          : line,
      ),
    );
  }

  return (
    <section className="boss-boxes-page">
      <section className="panel ocr-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OCR import</p>
            <h2>Box nyitási screenshot feldolgozása</h2>
            <p className="helper-copy">
              Tölts fel egy képet a chat logról. A rendszer megpróbálja
              felismerni az itemneveket és a mennyiségeket.
            </p>
          </div>
          <label className="secondary ocr-upload">
            <input
              type="file"
              accept="image/*"
              onChange={handleOcrFileChange}
              disabled={isOcrRunning}
            />
            {isOcrRunning ? "Feldolgozás..." : "Screenshot feltöltése"}
          </label>
        </div>

        {isOcrRunning ? (
          <p className="muted">OCR folyamat: {ocrProgress}%</p>
        ) : null}
        {ocrError ? <p className="ocr-error">{ocrError}</p> : null}

        {ocrLines.length > 0 ? (
          <>
            <div className="ocr-summary">
              <span>Felismert sorok: {ocrLines.length}</span>
              <span>
                Nyitott ládák száma:{" "}
                {ocrOpenedBoxCount == null ? "ismeretlen" : ocrOpenedBoxCount}
              </span>
              <span className={reviewCount > 0 ? "warn" : "ok"}>
                Ellenőrzendő tételek: {reviewCount}
              </span>
            </div>

            <div className="ocr-result-list">
              {ocrLines.map((entry, index) => (
                <article
                  className={`ocr-result-row ${entry.needsReview ? "needs-review" : ""}`}
                  key={`${entry.sourceLine}-${index}`}
                >
                  <div className="ocr-edit-grid">
                    <label className="price-field">
                      <span>Felismert név</span>
                      <strong>{entry.recognizedName}</strong>
                    </label>

                    <label className="price-field">
                      <span>Javított item név</span>
                      <EditableItemAutocomplete
                        value={entry.itemNameInput}
                        onValueChange={(value) =>
                          updateOcrItemName(entry.id, value)
                        }
                        onSelectItem={(itemId, itemName) =>
                          applyOcrItemSelection(entry.id, itemId, itemName)
                        }
                        placeholder="Kezdj el gépelni..."
                        ariaLabel="OCR tétel javítása"
                      />
                    </label>

                    <label className="price-field">
                      <span>Mennyiség</span>
                      <input
                        type="number"
                        min={0}
                        value={entry.quantity}
                        onChange={(event) =>
                          updateOcrQuantity(entry.id, event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="ocr-match-meta">
                    {entry.matchedItemId == null ||
                    entry.matchedItemName == null ? (
                      <span className="warn">Nincs megbízható egyezés</span>
                    ) : (
                      <span>
                        <ItemIcon
                          itemId={entry.matchedItemId}
                          name={entry.matchedItemName}
                          size={14}
                        />{" "}
                        {entry.matchedItemName} (#{entry.matchedItemId})
                      </span>
                    )}
                    <span>
                      Biztonság: {(entry.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <details>
              <summary>Nyers OCR szöveg megjelenítése</summary>
              <pre className="ocr-raw-text">{ocrText}</pre>
            </details>
          </>
        ) : (
          <div className="empty-state">
            Még nincs feldolgozott screenshot. Válassz egy képet az OCR
            ellenőrzéshez.
          </div>
        )}
      </section>

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
                    <ItemIcon itemId={box.id} name={box.name} size={18} />{" "}
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
                    <div
                      className="boss-drop-row"
                      key={`${box.id}-${drop.itemId}`}
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

function toEditableOcrLines(matches: MatchedOcrDropLine[]): EditableOcrLine[] {
  return matches.map((entry, index) => ({
    id: `${entry.sourceLine}-${index}`,
    recognizedName: entry.rawName,
    sourceLine: entry.sourceLine,
    quantity: entry.quantity,
    itemNameInput: entry.matchedItemName ?? entry.rawName,
    matchedItemId: entry.matchedItemId,
    matchedItemName: entry.matchedItemName,
    confidence: entry.confidence,
    needsReview: entry.needsReview,
  }));
}

function findExactItemByName(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  return items.find((item) => normalizeText(item.name) === normalized) ?? null;
}
