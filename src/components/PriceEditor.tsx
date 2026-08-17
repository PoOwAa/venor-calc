import type { Item, ItemId, PriceMap } from "../types/domain";

interface Props {
  items: Item[];
  targetName: string;
  prices: PriceMap;
  onChange: (next: PriceMap) => void;
}

export function PriceEditor({ items, targetName, prices, onChange }: Props) {
  function update(id: ItemId, rawValue: string) {
    const normalized = rawValue.replace(/\s/g, "");
    const parsed = normalized === "" ? null : Number(normalized);
    onChange({ ...prices, [id]: Number.isFinite(parsed) ? parsed : null });
  }

  function clearVisiblePrices() {
    const next: PriceMap = { ...prices };
    for (const item of items) {
      delete next[item.id];
    }
    onChange(next);
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Piaci adatok</p>
          <h2>Árazható hozzávalók</h2>
          <p className="helper-copy">
            Csak azokat a piaci tárgyakat mutatjuk, amelyek a(z) {targetName}{" "}
            elkészítéséhez vagy közvetlen megvételéhez relevánsak.
          </p>
        </div>
        <button className="secondary" onClick={clearVisiblePrices}>
          Látható árak törlése
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          Ehhez a tárgyhoz jelenleg nincs megadható piaci alapanyag vagy
          közvetlen piaci ár.
        </div>
      ) : (
        <div className="price-grid">
          {items.map((item) => (
            <label className="price-field" key={item.id}>
              <span>{item.name}</span>
              <div className="input-with-suffix">
                <input
                  inputMode="numeric"
                  placeholder="pl. 80000000"
                  value={prices[item.id] ?? ""}
                  onChange={(event) => update(item.id, event.target.value)}
                />
                <span>Arany</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
