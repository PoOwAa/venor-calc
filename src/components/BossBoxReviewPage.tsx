import { useEffect, useMemo, useState } from "react";
import { itemById } from "../data/items";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";
import { ItemIcon } from "./ItemIcon";

const SCREENSHOT_BUCKET = "box-opening-screenshots";
const REVIEW_QUEUE_TABLE = "box_opening_review_queue";

interface ReviewQueueRow {
  id: string;
  box_item_id: number;
  opened_box_count: number | null;
  screenshot_object_path: string;
  screenshot_source_filename: string | null;
  raw_ocr_text: string;
  unresolved_count: number;
  submitted_entries: unknown;
  submitted_by: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer_note: string | null;
  created_at: string;
}

interface ReviewQueueRowWithUrl extends ReviewQueueRow {
  screenshotUrl: string | null;
  uploaderLabel?: string;
}

interface SubmittedEntry {
  recognized_name?: string;
  corrected_name?: string;
  item_id?: number | null;
  matched_item_name?: string | null;
  quantity?: number;
  confidence?: number;
  needs_review?: boolean;
}

export function BossBoxReviewPage() {
  const [rows, setRows] = useState<ReviewQueueRowWithUrl[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionRowId, setActionRowId] = useState<string | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>(
    {},
  );

  const pendingCount = useMemo(
    () => rows.filter((row) => row.status === "pending").length,
    [rows],
  );

  useEffect(() => {
    void loadPendingSubmissions();
  }, []);

  async function loadPendingSubmissions() {
    if (!isSupabaseConfigured()) {
      setError(
        "A reviewer nézethez hiányzik a Supabase konfiguráció (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();

      const query = await supabase
        .from(REVIEW_QUEUE_TABLE)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);

      if (query.error) throw query.error;

      const queueRows = (query.data ?? []) as ReviewQueueRow[];

      const [pendingCountQuery, approvedCountQuery, rejectedCountQuery] =
        await Promise.all([
          supabase
            .from(REVIEW_QUEUE_TABLE)
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from(REVIEW_QUEUE_TABLE)
            .select("id", { count: "exact", head: true })
            .eq("status", "approved"),
          supabase
            .from(REVIEW_QUEUE_TABLE)
            .select("id", { count: "exact", head: true })
            .eq("status", "rejected"),
        ]);

      setStatusCounts({
        pending: pendingCountQuery.count ?? 0,
        approved: approvedCountQuery.count ?? 0,
        rejected: rejectedCountQuery.count ?? 0,
      });

      const rowsWithUrls = await Promise.all(
        queueRows.map(async (row) => {
          const signed = await supabase.storage
            .from(SCREENSHOT_BUCKET)
            .createSignedUrl(row.screenshot_object_path, 60 * 60);

          const uploaderLabel = await getUploaderLabel(
            supabase,
            row.submitted_by,
          );

          return {
            ...row,
            uploaderLabel,
            screenshotUrl: signed.data?.signedUrl ?? null,
          } satisfies ReviewQueueRowWithUrl & { uploaderLabel: string };
        }),
      );

      setRows(rowsWithUrls);
    } catch (loadError) {
      console.error(loadError);
      setError(
        "Nem sikerült betölteni a review queue elemeket. Ellenőrizd a policy-kat és a Supabase kapcsolatot.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(rowId: string) {
    await applyDecision(rowId, "approve");
  }

  async function handleReject(rowId: string) {
    await applyDecision(rowId, "reject");
  }

  async function applyDecision(rowId: string, decision: "approve" | "reject") {
    if (!isSupabaseConfigured()) return;

    setActionRowId(rowId);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();
      const note = reviewerNotes[rowId] ?? null;

      if (decision === "approve") {
        const result = await supabase.rpc("approve_box_opening_submission", {
          p_review_queue_id: rowId,
          p_reviewer_note: note,
        });
        if (result.error) throw result.error;
      } else {
        const result = await supabase.rpc("reject_box_opening_submission", {
          p_review_queue_id: rowId,
          p_reviewer_note: note,
        });
        if (result.error) throw result.error;
      }

      setRows((current) => current.filter((row) => row.id !== rowId));
      setMessage(
        decision === "approve"
          ? "A submission jóváhagyva és átemelve az approved táblába."
          : "A submission elutasítva lett.",
      );
    } catch (decisionError) {
      console.error(decisionError);
      setError(
        "A reviewer művelet nem sikerült. Ellenőrizd a Supabase RPC/policy beállításokat.",
      );
    } finally {
      setActionRowId(null);
    }
  }

  return (
    <section className="review-page">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Reviewer</p>
            <h2>Függő OCR submissionök</h2>
            <p className="helper-copy">
              Itt tudod összevetni a screenshotot és a feldolgozott sorokat,
              majd jóváhagyni vagy elutasítani a mintát.
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => void loadPendingSubmissions()}
            disabled={isLoading}
          >
            {isLoading ? "Frissítés..." : "Frissítés"}
          </button>
        </div>

        <div className="ocr-summary">
          <span>Pending elemek: {pendingCount}</span>
          <span>Approved: {statusCounts.approved}</span>
          <span>Rejected: {statusCounts.rejected}</span>
          <span>Betöltési limit: 50</span>
        </div>

        {error ? <p className="ocr-error">{error}</p> : null}
        {message ? <p className="ocr-success">{message}</p> : null}
      </section>

      {rows.length === 0 ? (
        <div className="empty-state">Nincs review-ra váró beküldés.</div>
      ) : (
        <div className="review-grid">
          {rows.map((row) => {
            const box = itemById[row.box_item_id];
            const entries = normalizeEntries(row.submitted_entries);
            const isActing = actionRowId === row.id;

            return (
              <article className="panel review-card" key={row.id}>
                <div className="review-card-header">
                  <div>
                    <h3>
                      <ItemIcon
                        itemId={row.box_item_id}
                        name={
                          box?.locale_name ||
                          box?.name ||
                          `Box #${row.box_item_id}`
                        }
                        size={18}
                      />{" "}
                      {box?.locale_name ||
                        box?.name ||
                        `Ismeretlen box (#${row.box_item_id})`}
                    </h3>
                    <p className="muted">
                      Submission:{" "}
                      {new Date(row.created_at).toLocaleString("hu-HU")}
                    </p>
                    <p className="muted">
                      Feltöltő: {row.uploaderLabel ?? "ismeretlen"}
                    </p>
                  </div>
                  <span className="review-chip">
                    {row.unresolved_count} bizonytalan sor
                  </span>
                </div>

                <div className="review-meta-grid">
                  <div>
                    <span>Nyitott ládák</span>
                    <strong>{row.opened_box_count ?? "ismeretlen"}</strong>
                  </div>
                  <div>
                    <span>Forrás fájl</span>
                    <strong>{row.screenshot_source_filename ?? "n/a"}</strong>
                  </div>
                  <div>
                    <span>Screenshot objektum</span>
                    <strong>{row.screenshot_object_path}</strong>
                  </div>
                </div>

                <div className="review-content-grid">
                  <div className="review-table-panel">
                    <div className="review-entries">
                      <div className="review-entry-header">
                        <span>Javított</span>
                        <span>Menny.</span>
                        <span>Biz.</span>
                      </div>
                      {entries.map((entry, index) => (
                        <div
                          className={`review-entry-row ${entry.needs_review ? "needs-review" : ""}`}
                          key={`${row.id}-${index}`}
                        >
                          <span className="review-entry-item">
                            {entry.item_id != null ? (
                              <ItemIcon
                                itemId={entry.item_id}
                                name={
                                  entry.corrected_name ??
                                  itemById[entry.item_id]?.locale_name ??
                                  itemById[entry.item_id]?.name ??
                                  `Item #${entry.item_id}`
                                }
                                size={18}
                              />
                            ) : null}
                            {entry.corrected_name ?? "-"}
                          </span>
                          <span>{entry.quantity ?? 0}</span>
                          <span>
                            {typeof entry.confidence === "number"
                              ? `${(entry.confidence * 100).toFixed(0)}%`
                              : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="review-image-wrap review-image-panel">
                    {row.screenshotUrl ? (
                      <img
                        src={row.screenshotUrl}
                        alt="Beküldött screenshot"
                        className="review-image"
                      />
                    ) : (
                      <div className="empty-state">
                        A screenshot előnézet nem elérhető (ellenőrizd a storage
                        policy-kat).
                      </div>
                    )}
                  </div>
                </div>

                <label className="price-field">
                  <span>Reviewer megjegyzés</span>
                  <input
                    type="text"
                    placeholder="pl. ellenőrizve kézzel"
                    value={reviewerNotes[row.id] ?? ""}
                    onChange={(event) =>
                      setReviewerNotes((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="review-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={isActing}
                    onClick={() => void handleReject(row.id)}
                  >
                    {isActing ? "Művelet..." : "Elutasítás"}
                  </button>
                  <button
                    type="button"
                    className="secondary approve"
                    disabled={isActing}
                    onClick={() => void handleApprove(row.id)}
                  >
                    {isActing ? "Művelet..." : "Jóváhagyás"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

async function getUploaderLabel(
  supabase: ReturnType<typeof getSupabaseClient>,
  submittedBy: string | null,
): Promise<string> {
  if (!submittedBy) {
    return "ismeretlen felhasználó";
  }

  try {
    const { data, error } = await supabase.rpc("get_user_display_name", {
      p_user_id: submittedBy,
    });

    if (error) throw error;
    if (typeof data === "string" && data.trim()) {
      return data;
    }
  } catch (error) {
    console.error("Could not resolve uploader label", error);
  }

  return submittedBy;
}

function normalizeEntries(value: unknown): SubmittedEntry[] {
  if (!Array.isArray(value)) return [];
  return value as SubmittedEntry[];
}
