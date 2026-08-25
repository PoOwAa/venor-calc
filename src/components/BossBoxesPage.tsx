import { useMemo, useState } from "react";
import { boxOpeningSamples } from "../data/bossBoxObservations";
import { itemById, items } from "../data/items";
import { formatGold } from "../lib/format";
import { buildBossBoxStats } from "../lib/bossBoxes";
import {
  matchDropsToKnownItems,
  normalizeText,
  parseBoxOcrText,
  type MatchedOcrDropLine,
} from "../lib/bossBoxOcr";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";
import type { PriceMap } from "../types/domain";
import { EditableItemAutocomplete } from "./EditableItemAutocomplete";
import { ItemIcon } from "./ItemIcon";

const SCREENSHOT_BUCKET = "box-opening-screenshots";
const REVIEW_QUEUE_TABLE = "box_opening_review_queue";

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
  const bossBoxes = useMemo(
    () => items.filter((item) => item.type === "ITEM_GIFTBOX"),
    [],
  );

  const [selectedBoxId, setSelectedBoxId] = useState<number>(
    bossBoxes[0]?.vnum ?? 0,
  );
  const [uploadedScreenshot, setUploadedScreenshot] = useState<File | null>(
    null,
  );
  const [ocrText, setOcrText] = useState("");
  const [ocrLines, setOcrLines] = useState<EditableOcrLine[]>([]);
  const [ocrOpenedBoxCount, setOcrOpenedBoxCount] = useState<number | null>(
    null,
  );
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

    setUploadedScreenshot(file);
    setSaveError(null);
    setSaveMessage(null);

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
            matchedItemId: exactMatch.vnum,
            matchedItemName: exactMatch.locale_name || exactMatch.name,
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

  async function handleSaveSubmission() {
    if (!uploadedScreenshot) {
      setSaveError("Előbb tölts fel egy screenshotot.");
      return;
    }

    if (ocrLines.length === 0) {
      setSaveError("Nincs menthető OCR eredmény.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setSaveError(
        "A Supabase környezeti változók hiányoznak. Add meg a VITE_SUPABASE_URL és VITE_SUPABASE_ANON_KEY értékeket.",
      );
      return;
    }

    setIsSavingResult(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const supabase = getSupabaseClient();
      const webpBlob = await convertImageToWebp(uploadedScreenshot);
      const objectPath = buildScreenshotPath(uploadedScreenshot.name);

      const uploadResult = await supabase.storage
        .from(SCREENSHOT_BUCKET)
        .upload(objectPath, webpBlob, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const queuePayload = {
        box_item_id: selectedBoxId,
        opened_box_count: ocrOpenedBoxCount,
        screenshot_object_path: objectPath,
        screenshot_source_filename: uploadedScreenshot.name,
        raw_ocr_text: ocrText,
        unresolved_count: ocrLines.filter((line) => line.needsReview).length,
        submitted_entries: ocrLines.map((line) => ({
          recognized_name: line.recognizedName,
          corrected_name: line.itemNameInput,
          item_id: line.matchedItemId,
          matched_item_name: line.matchedItemName,
          quantity: line.quantity,
          confidence: line.confidence,
          needs_review: line.needsReview,
          source_line: line.sourceLine,
        })),
      };

      const insertResult = await supabase
        .from(REVIEW_QUEUE_TABLE)
        .insert(queuePayload);

      if (insertResult.error) {
        throw insertResult.error;
      }

      setSaveMessage(
        "A screenshot és a feldolgozott adat mentésre került a review queue táblába.",
      );
    } catch (error) {
      console.error(error);
      setSaveError(
        "Mentési hiba történt. Ellenőrizd a Supabase bucket/policy és a tábla beállításokat.",
      );
    } finally {
      setIsSavingResult(false);
    }
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

        <div className="ocr-controls">
          <label className="price-field ocr-box-select">
            <span>Melyik ládát nyitottátok?</span>
            <select
              value={selectedBoxId}
              onChange={(event) => setSelectedBoxId(Number(event.target.value))}
            >
              {bossBoxes.map((box) => (
                <option key={box.vnum} value={box.vnum}>
                  {box.name} (#{box.vnum})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="secondary save-ocr-button"
            onClick={handleSaveSubmission}
            disabled={isSavingResult || isOcrRunning || ocrLines.length === 0}
          >
            {isSavingResult
              ? "Mentés folyamatban..."
              : "Mentés review queue-ba"}
          </button>
        </div>

        {uploadedScreenshot ? (
          <p className="muted">
            Feltöltött screenshot: {uploadedScreenshot.name}
          </p>
        ) : null}

        {isOcrRunning ? (
          <p className="muted">OCR folyamat: {ocrProgress}%</p>
        ) : null}
        {ocrError ? <p className="ocr-error">{ocrError}</p> : null}
        {saveError ? <p className="ocr-error">{saveError}</p> : null}
        {saveMessage ? <p className="ocr-success">{saveMessage}</p> : null}

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

function buildScreenshotPath(originalName: string): string {
  const safeName = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-");
  const randomId = crypto.randomUUID();
  return `pending/${new Date().toISOString().slice(0, 10)}/${safeName}-${randomId}.webp`;
}

async function convertImageToWebp(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("A böngésző nem támogatja a canvas kontextust.");
    }

    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.9);
    });

    if (!blob) {
      throw new Error("Nem sikerült webP képet előállítani.");
    }

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A kép betöltése sikertelen."));
    image.src = url;
  });
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

  return (
    items.find(
      (item) => normalizeText(item.locale_name || item.name) === normalized,
    ) ?? null
  );
}
