import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BossBoxReviewPage } from "./components/BossBoxReviewPage";
import { ItemAutocomplete } from "./components/ItemAutocomplete";
import { BossBoxesPage } from "./components/BossBoxesPage";
import { ItemIcon } from "./components/ItemIcon";
import { PriceEditor } from "./components/PriceEditor";
import { PathView } from "./components/PathView";
import { itemById, items } from "./data/items";
import { formatGold } from "./lib/format";
import { getRelevantTradableItems, optimize } from "./lib/optimizer";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase";
import type { PriceMap } from "./types/domain";

const STORAGE_KEY = "venor-calc-prices-v1";

const defaultPrices: PriceMap = items.reduce<PriceMap>((prices, item) => {
  prices[item.vnum] = item.shop_buy_price ?? 0;
  return prices;
}, {});

export default function App() {
  const menuItems = [
    { key: "crafting", label: "Kraftolás" },
    { key: "boss-boxes", label: "Boss ládák" },
    { key: "review", label: "Review" },
  ] as const;
  const [activeMenu, setActiveMenu] = useState<
    (typeof menuItems)[number]["key"]
  >(menuItems[0].key);
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
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [membershipState, setMembershipState] = useState<
    "idle" | "checking" | "allowed" | "denied" | "error"
  >("idle");
  const [membershipMessage, setMembershipMessage] = useState<string | null>(
    null,
  );

  const selectedTarget = targetItem == null ? null : itemById[targetItem];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
  }, [prices]);

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
        <div>
          <span className="brand-mark">VC</span>
          <p className="eyebrow">Venor2 optimizer</p>
          <h1>VenorCalc</h1>
          <p className="hero-copy">
            Optimalizáld a kraftolást és kezeld egy helyen a boss ládákhoz
            kapcsolódó számolásokat.
          </p>
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

      {activeMenu === "crafting" ? (
        <>
          <section className="panel crafting-summary-panel">
            <div className="crafting-summary">
              <div>
                <p className="eyebrow">Kraftolás</p>
                <h2>Legjobb kalkulált ár</h2>
                <p className="helper-copy">
                  A kiválasztott cél és mennyiség alapján számolva.
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
