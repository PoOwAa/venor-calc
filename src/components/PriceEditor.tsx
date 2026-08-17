import { items } from "../data/items";
import type { PriceMap } from "../types/domain";

interface Props {
  prices: PriceMap;
  onChange: (next: PriceMap) => void;
}

export function PriceEditor({ prices, onChange }: Props) {
  const tradableItems = items.filter((item) => item.tradable);

  function update(id: string, rawValue: string) {
    const normalized = rawValue.replace(/\s/g, "");
    const parsed = normalized === "" ? null : Number(normalized);
    onChange({ ...prices, [id]: Number.isFinite(parsed) ? parsed : null });
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Piaci adatok</p>
          <h2>Aktuális árak</h2>
        </div>
        <button className="secondary" onClick={() => onChange({})}>
          Árak törlése
        </button>
      </div>

      <div className="price-grid">
        {tradableItems.map((item) => (
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
    </section>
  );
}
