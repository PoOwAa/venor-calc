import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BossBoxReviewPage } from "./components/BossBoxReviewPage";
import { BossBoxUploadPage } from "./components/BossBoxUploadPage";
import { ItemAutocomplete } from "./components/ItemAutocomplete";
import { BossBoxesPage } from "./components/BossBoxesPage";
import { ItemIcon } from "./components/ItemIcon";
import { PriceEditor } from "./components/PriceEditor";
import { PathView } from "./components/PathView";
import { itemById, items } from "./data/items";
import { formatGold } from "./lib/format";
import { getRelevantTradableItems, optimize } from "./lib/optimizer";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase";
import { vendorRecipeGroups } from "./data/vendors";
import type { PriceMap } from "./types/domain";

const SHARED_PRICE_SET_ID = "shared";
const PRICE_SYNC_PREF_KEY = "venor-calc-central-price-override-v1";
const SITE_LOGO = `${import.meta.env.BASE_URL}logo/venorcalc-profile.png`;

interface PriceChangeToast {
  id: string;
  itemId: number;
  itemName: string;
  newPrice: number;
}

const defaultPrices: PriceMap = items.reduce<PriceMap>((prices, item) => {
  prices[item.vnum] = item.shop_buy_price ?? 0;
  return prices;
}, {});

function mergeStoredPrices(storedPrices: unknown): PriceMap {
  const nextPrices: PriceMap = { ...defaultPrices };

  if (
    !storedPrices ||
    typeof storedPrices !== "object" ||
    Array.isArray(storedPrices)
  ) {
    return nextPrices;
  }

  for (const [rawItemId, rawValue] of Object.entries(
    storedPrices as Record<string, unknown>,
  )) {
    const itemId = Number(rawItemId);
    if (!Number.isFinite(itemId)) continue;

    if (rawValue == null) {
      nextPrices[itemId] = null;
      continue;
    }

    const parsedValue = Number(rawValue);
    nextPrices[itemId] = Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return nextPrices;
}

function normalizeStoredPriceOverrides(
  storedPrices: unknown,
): Record<number, number | null> {
  const normalized: Record<number, number | null> = {};

  if (
    !storedPrices ||
    typeof storedPrices !== "object" ||
    Array.isArray(storedPrices)
  ) {
    return normalized;
  }

  for (const [rawItemId, rawValue] of Object.entries(
    storedPrices as Record<string, unknown>,
  )) {
    const itemId = Number(rawItemId);
    if (!Number.isFinite(itemId)) continue;

    if (rawValue == null) {
      normalized[itemId] = null;
      continue;
    }

    const parsedValue = Number(rawValue);
    normalized[itemId] = Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return normalized;
}

function buildStoredPriceOverrides(
  prices: PriceMap,
): Record<string, number | null> {
  const overrides: Record<string, number | null> = {};

  for (const [rawItemId, value] of Object.entries(prices)) {
    const itemId = Number(rawItemId);
    if (!Number.isFinite(itemId)) continue;

    const defaultValue = defaultPrices[itemId] ?? 0;
    if (value == null) {
      if (defaultValue !== null && defaultValue !== 0) {
        overrides[rawItemId] = null;
      }
      continue;
    }

    if (value !== defaultValue) {
      overrides[rawItemId] = value;
    }
  }

  return overrides;
}

export default function App() {
  const menuItems = [
    { key: "crafting", label: "Kraftolás" },
    { key: "boss-boxes", label: "Boss ládák" },
    { key: "boss-box-upload", label: "Boss láda nyitás feltöltése" },
    { key: "review", label: "Review" },
  ] as const;
  const [activeMenu, setActiveMenu] = useState<
    (typeof menuItems)[number]["key"]
  >(menuItems[0].key);
  const [prices, setPrices] = useState<PriceMap>(defaultPrices);
  const [targetItem, setTargetItem] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [centralPriceOverrideEnabled, setCentralPriceOverrideEnabled] =
    useState(() => localStorage.getItem(PRICE_SYNC_PREF_KEY) === "true");
  const [priceSyncReady, setPriceSyncReady] = useState(false);
  const [priceSyncMessage, setPriceSyncMessage] = useState<string | null>(null);
  const [sharedPriceOverrides, setSharedPriceOverrides] = useState<
    Record<number, number | null>
  >({});
  const [priceChangeToasts, setPriceChangeToasts] = useState<
    PriceChangeToast[]
  >([]);
  const [membershipState, setMembershipState] = useState<
    "idle" | "checking" | "allowed" | "denied" | "error"
  >("idle");
  const [membershipMessage, setMembershipMessage] = useState<string | null>(
    null,
  );

  const selectedTarget = targetItem == null ? null : itemById[targetItem];

  useEffect(() => {
    localStorage.setItem(
      PRICE_SYNC_PREF_KEY,
      centralPriceOverrideEnabled ? "true" : "false",
    );
  }, [centralPriceOverrideEnabled]);

  useEffect(() => {
    let ignore = false;

    async function loadSharedPrices() {
      if (!isSupabaseConfigured() || !session) {
        if (!ignore) {
          setPrices(defaultPrices);
          setPriceSyncReady(false);
          setPriceSyncMessage(null);
        }
        return;
      }

      if (!ignore) {
        setPriceSyncReady(false);
        setPriceSyncMessage(null);
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("shared_market_prices")
          .select("price_overrides, updated_by")
          .eq("id", SHARED_PRICE_SET_ID)
          .maybeSingle();

        if (error) throw error;

        if (!ignore) {
          const nextOverrides = normalizeStoredPriceOverrides(
            data?.price_overrides,
          );
          setSharedPriceOverrides(nextOverrides);
          setPrices(mergeStoredPrices(nextOverrides));
          setPriceSyncReady(true);
        }
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setPrices(defaultPrices);
          setPriceSyncReady(false);
          setPriceSyncMessage(
            "Nem sikerült betölteni a közös árlistát a Supabase-ből.",
          );
        }
      }
    }

    void loadSharedPrices();

    return () => {
      ignore = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !session) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`shared-market-prices:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_market_prices",
          filter: `id=eq.${SHARED_PRICE_SET_ID}`,
        },
        (payload) => {
          const newRow = payload.new as
            | {
                price_overrides?: unknown;
                updated_by?: string | null;
              }
            | undefined;

          if (!newRow) return;
          if (newRow.updated_by === session.user.id) return;

          const nextOverrides = normalizeStoredPriceOverrides(
            newRow.price_overrides,
          );

          setSharedPriceOverrides((currentOverrides) => {
            const changedItems = Object.keys(nextOverrides)
              .map((rawItemId) => Number(rawItemId))
              .filter((itemId) => {
                const nextValue = nextOverrides[itemId] ?? null;
                const currentValue = currentOverrides[itemId] ?? null;
                return (
                  nextValue != null &&
                  nextValue > 0 &&
                  nextValue !== currentValue
                );
              });

            if (changedItems.length > 0) {
              const nextToasts = changedItems.map((itemId) => ({
                id: `${Date.now()}-${itemId}-${Math.random().toString(36).slice(2, 8)}`,
                itemId,
                itemName:
                  itemById[itemId]?.locale_name ??
                  itemById[itemId]?.name ??
                  `Item ${itemId}`,
                newPrice: nextOverrides[itemId] ?? 0,
              }));

              setPriceChangeToasts((currentToasts) => [
                ...currentToasts,
                ...nextToasts,
              ]);

              for (const toast of nextToasts) {
                window.setTimeout(() => {
                  setPriceChangeToasts((currentToasts) =>
                    currentToasts.filter((entry) => entry.id !== toast.id),
                  );
                }, 5000);
              }
            }

            return nextOverrides;
          });

          setPrices(mergeStoredPrices(nextOverrides));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (
      !priceSyncReady ||
      !session ||
      !isSupabaseConfigured() ||
      !centralPriceOverrideEnabled
    )
      return;

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const supabase = getSupabaseClient();
          const nextOverrides = buildStoredPriceOverrides(prices);
          const { error } = await supabase.from("shared_market_prices").upsert(
            {
              id: SHARED_PRICE_SET_ID,
              price_overrides: nextOverrides,
              updated_by: session.user.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

          if (error) throw error;

          setSharedPriceOverrides(normalizeStoredPriceOverrides(nextOverrides));

          setPriceSyncMessage(null);
        } catch (error) {
          console.error(error);
          setPriceSyncMessage(
            "Nem sikerült menteni a közös árakat a Supabase-be.",
          );
        }
      })();
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [prices, priceSyncReady, session?.user.id, centralPriceOverrideEnabled]);

  useEffect(() => {
    if (centralPriceOverrideEnabled) return;
    setPriceSyncMessage(null);
  }, [centralPriceOverrideEnabled]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      setMembershipState("error");
      setMembershipMessage(
        "Hiányzó Supabase konfiguráció. Állítsd be a VITE_SUPABASE_URL és VITE_SUPABASE_ANON_KEY változókat.",
      );
      return;
    }

    const supabase = getSupabaseClient();
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession ?? null);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    if (!session) {
      setMembershipState("idle");
      setMembershipMessage(null);
      return;
    }

    void verifyDiscordMembership();
  }, [session?.user.id]);

  const relevantTradableItems = useMemo(
    () => (targetItem == null ? [] : getRelevantTradableItems(targetItem)),
    [targetItem],
  );

  const totalRecipeCount = useMemo(
    () =>
      vendorRecipeGroups.reduce((sum, group) => sum + group.recipes.length, 0),
    [],
  );

  const results = useMemo(
    () =>
      targetItem == null
        ? []
        : optimize(targetItem, Math.max(1, quantity), prices),
    [targetItem, quantity, prices],
  );

  async function signInWithDiscord() {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseClient();
    const redirectTo = window.location.href;
    const result = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo,
        scopes: "identify",
      },
    });

    if (result.error) {
      setMembershipState("error");
      setMembershipMessage(
        "Discord bejelentkezés indítása sikertelen volt. Ellenőrizd a Supabase Discord provider beállításait.",
      );
    }
  }

  async function signOut() {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setSession(null);
    setMembershipState("idle");
    setMembershipMessage(null);
  }

  async function verifyDiscordMembership() {
    if (!isSupabaseConfigured() || !session) return;

    setMembershipState("checking");
    setMembershipMessage(null);

    try {
      const supabase = getSupabaseClient();
      const response = await supabase.functions.invoke("discord-guild-check", {
        body: {},
      });

      if (response.error) {
        throw response.error;
      }

      const allowed = Boolean(response.data?.allowed);
      if (allowed) {
        setMembershipState("allowed");
        setMembershipMessage(null);
      } else {
        setMembershipState("denied");
        setMembershipMessage(
          response.data?.reason ??
            "A Discord fiókod nem jogosult ennek az alkalmazásnak a használatára.",
        );
      }
    } catch (error) {
      console.error(error);
      setMembershipState("error");
      setMembershipMessage(
        "A Discord tagság ellenőrzése sikertelen. Ellenőrizd a Supabase Edge Function és Discord bot beállításokat.",
      );
    }
  }

  if (authLoading) {
    return (
      <main className="app-shell">
        <section className="panel auth-panel">
          <img className="site-logo" src={SITE_LOGO} alt="VenorCalc" />
          <h2>Hitelesítés ellenőrzése</h2>
          <p className="helper-copy">
            Kérlek várj, betöltjük a munkamenetet...
          </p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell">
        <section className="panel auth-panel">
          <img className="site-logo" src={SITE_LOGO} alt="VenorCalc" />
          <p className="eyebrow">Belépés szükséges</p>
          <h1>VenorCalc</h1>
          <p className="helper-copy">
            Az alkalmazás használatához Discord belépés és szervertagság
            ellenőrzés szükséges.
          </p>
          <button
            type="button"
            className="secondary"
            onClick={signInWithDiscord}
          >
            Belépés Discorddal
          </button>
          {membershipMessage ? (
            <p className="ocr-error auth-message">{membershipMessage}</p>
          ) : null}
        </section>
      </main>
    );
  }

  if (membershipState === "checking" || membershipState === "idle") {
    return (
      <main className="app-shell">
        <section className="panel auth-panel">
          <img className="site-logo" src={SITE_LOGO} alt="VenorCalc" />
          <h2>Discord jogosultság ellenőrzése</h2>
          <p className="helper-copy">
            Ellenőrizzük, hogy tagja vagy-e a szükséges Discord szervernek.
          </p>
          <button type="button" className="secondary" onClick={signOut}>
            Kijelentkezés
          </button>
        </section>
      </main>
    );
  }

  if (membershipState === "denied" || membershipState === "error") {
    return (
      <main className="app-shell">
        <section className="panel auth-panel">
          <h2>Hozzáférés megtagadva</h2>
          <p className="helper-copy">
            {membershipMessage ??
              "A Discord fiókod jelenleg nem jogosult ennek az alkalmazásnak a használatára."}
          </p>
          <div className="auth-actions">
            <button
              type="button"
              className="secondary"
              onClick={verifyDiscordMembership}
            >
              Újraellenőrzés
            </button>
            <button type="button" className="secondary" onClick={signOut}>
              Kijelentkezés
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-branding">
          <img className="site-logo" src={SITE_LOGO} alt="VenorCalc" />
          <p className="eyebrow">Venor2 optimizer</p>
          <h1>VenorCalc</h1>
          <p className="hero-copy">
            Optimalizáld a kraftolást és kezeld egy helyen a boss ládákhoz
            kapcsolódó számolásokat.
          </p>
          <label className="price-field">
            <span>Központi árakat felülírása</span>
            <input
              type="checkbox"
              checked={centralPriceOverrideEnabled}
              onChange={(event) =>
                setCentralPriceOverrideEnabled(event.target.checked)
              }
            />
          </label>
        </div>
        <button
          type="button"
          className="secondary auth-logout"
          onClick={signOut}
        >
          Kijelentkezés
        </button>
      </header>

      <nav className="top-menu" aria-label="Főmenü">
        {menuItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`menu-item ${activeMenu === item.key ? "active" : ""}`}
            onClick={() => setActiveMenu(item.key)}
            aria-current={activeMenu === item.key ? "page" : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {priceChangeToasts.length > 0 ? (
        <div
          className="toast-stack"
          aria-live="polite"
          aria-relevant="additions"
        >
          {priceChangeToasts.map((toast) => (
            <article className="toast-card" key={toast.id}>
              <ItemIcon
                itemId={toast.itemId}
                name={toast.itemName}
                size={28}
                className="toast-icon"
              />
              <div className="toast-copy">
                <strong>{toast.itemName}</strong>
                <span>{formatGold(toast.newPrice)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {activeMenu === "crafting" ? (
        <>
          <section className="panel crafting-summary-panel">
            <div className="crafting-summary">
              <div>
                <p className="eyebrow">Kraftolás</p>
                <h2>Legjobb kalkulált ár</h2>
                <p className="helper-copy">
                  A teljes vendőrkatalógusból számolva, minden receptet
                  figyelembe véve.
                </p>
                {priceSyncMessage ? (
                  <p className="ocr-error">{priceSyncMessage}</p>
                ) : null}
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
            </div>
            <div className="crafting-summary-meta">
              <span>{vendorRecipeGroups.length} kereskedő</span>
              <span>{totalRecipeCount} recept</span>
            </div>
          </section>

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
                        itemId={selectedTarget.vnum}
                        name={selectedTarget.locale_name || selectedTarget.name}
                        size={18}
                      />{" "}
                      {selectedTarget.locale_name || selectedTarget.name}
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
                  onChange={(event) =>
                    setQuantity(Number(event.target.value) || 1)
                  }
                />
              </label>
            </div>
          </section>

          {selectedTarget ? (
            <PriceEditor
              items={relevantTradableItems}
              targetName={selectedTarget.locale_name || selectedTarget.name}
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
                Válassz ki egy tárgyat a keresőben, hogy megjelenjenek a
                releváns receptek és az ármezők.
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
                            name={
                              itemById[result.itemId]?.locale_name ??
                              itemById[result.itemId]?.name ??
                              result.sourceLabel
                            }
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
        </>
      ) : activeMenu === "boss-boxes" ? (
        <BossBoxesPage prices={prices} onPriceChange={setPrices} />
      ) : activeMenu === "boss-box-upload" ? (
        <BossBoxUploadPage />
      ) : (
        <BossBoxReviewPage />
      )}

      <footer>
        Az árak csak ebben a böngészőben kerülnek mentésre. A receptek a
        repositoryban verziózott statikus adatok.
      </footer>
    </main>
  );
}
