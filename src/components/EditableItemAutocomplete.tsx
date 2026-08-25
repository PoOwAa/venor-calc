import { useMemo, useState } from "react";
import { items } from "../data/items";
import { ItemIcon } from "./ItemIcon";

interface EditableItemAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelectItem?: (itemId: number, itemName: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

const MAX_SUGGESTIONS = 8;

function findExactItem(query: string) {
  const normalized = query.trim().toLocaleLowerCase("hu-HU");
  if (!normalized) return null;

  return (
    items.find(
      (item) =>
        item.name.toLocaleLowerCase("hu-HU") === normalized ||
        String(item.vnum) === normalized,
    ) ?? null
  );
}

function rankItems(query: string) {
  const normalized = query.trim().toLocaleLowerCase("hu-HU");

  if (!normalized) return [];

  return items
    .map((item) => {
      const name = item.name.toLocaleLowerCase("hu-HU");
      const id = String(item.vnum);

      let score = Number.POSITIVE_INFINITY;
      if (name === normalized || id === normalized) score = 0;
      else if (name.startsWith(normalized)) score = 1;
      else if (id.startsWith(normalized)) score = 2;
      else if (name.includes(normalized)) score = 3;
      else if (id.includes(normalized)) score = 4;

      return { item, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.item.name.localeCompare(b.item.name, "hu") ||
        a.item.vnum - b.item.vnum,
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.item);
}

export function EditableItemAutocomplete({
  value,
  onValueChange,
  onSelectItem,
  placeholder = "Kezdj el gépelni egy tárgynevet vagy item ID-t",
  ariaLabel = "OCR item kereső",
}: EditableItemAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(() => rankItems(value), [value]);

  function applyItem(itemId: number, itemName: string) {
    onValueChange(itemName);
    onSelectItem?.(itemId, itemName);
    setIsOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="autocomplete">
      <input
        className="autocomplete-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => {
          if (value.trim()) setIsOpen(true);
        }}
        onBlur={() => {
          const exactMatch = findExactItem(value);
          if (exactMatch) {
            applyItem(exactMatch.vnum, exactMatch.name);
          }

          window.setTimeout(() => {
            setIsOpen(false);
            setActiveIndex(0);
          }, 100);
        }}
        onKeyDown={(event) => {
          if (!isOpen && event.key === "ArrowDown" && suggestions.length > 0) {
            setIsOpen(true);
            return;
          }

          if (event.key === "ArrowDown" && suggestions.length > 0) {
            event.preventDefault();
            setActiveIndex((current) =>
              Math.min(current + 1, suggestions.length - 1),
            );
          }

          if (event.key === "ArrowUp" && suggestions.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          }

          if (event.key === "Enter" && suggestions[activeIndex]) {
            event.preventDefault();
            const item = suggestions[activeIndex];
            applyItem(item.vnum, item.name);
          }

          if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(0);
          }
        }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />

      {isOpen ? (
        <div className="autocomplete-menu">
          {suggestions.length === 0 ? (
            <div className="autocomplete-empty">Nincs találat.</div>
          ) : (
            suggestions.map((item, index) => (
              <button
                type="button"
                key={item.vnum}
                className={`autocomplete-option ${index === activeIndex ? "active" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyItem(item.vnum, item.name);
                }}
              >
                <span>
                  <ItemIcon itemId={item.vnum} name={item.name} /> {item.name}
                </span>
                <span className="muted">#{item.vnum}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
