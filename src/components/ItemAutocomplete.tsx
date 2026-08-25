import { useEffect, useMemo, useState } from "react";
import { itemById, items } from "../data/items";
import { getItemDisplayName, getItemNameForSearch } from "../lib/itemName";
import type { Item, ItemId } from "../types/domain";
import { ItemIcon } from "./ItemIcon";

interface Props {
  selectedItemId: ItemId | null;
  onSelect: (itemId: ItemId | null) => void;
  itemsToSearch?: Item[];
  placeholder?: string;
}

const MAX_SUGGESTIONS = 8;

function findExactItem(query: string, itemPool: Item[] = items) {
  const normalized = query.trim().toLocaleLowerCase("hu-HU");
  if (!normalized) return null;

  return (
    itemPool.find(
      (item) =>
        getItemNameForSearch(item).toLocaleLowerCase("hu-HU") === normalized ||
        String(item.vnum) === normalized,
    ) ?? null
  );
}

function rankItems(query: string, itemPool: Item[] = items) {
  const normalized = query.trim().toLocaleLowerCase("hu-HU");

  if (!normalized) return [];

  return itemPool
    .map((item) => {
      const name = getItemNameForSearch(item).toLocaleLowerCase("hu-HU");
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
        getItemNameForSearch(a.item).localeCompare(
          getItemNameForSearch(b.item),
          "hu",
        ) ||
        a.item.vnum - b.item.vnum,
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.item);
}

export function ItemAutocomplete({
  selectedItemId,
  onSelect,
  itemsToSearch = items,
  placeholder = "Kezdj el gépelni egy tárgynevet vagy item ID-t",
}: Props) {
  const selectedItem = selectedItemId == null ? null : itemById[selectedItemId];
  const [query, setQuery] = useState(
    selectedItem ? getItemDisplayName(selectedItem) : "",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setQuery(selectedItem ? getItemDisplayName(selectedItem) : "");
  }, [selectedItem]);

  const suggestions = useMemo(
    () => rankItems(query, itemsToSearch),
    [query, itemsToSearch],
  );
  const exactMatch = useMemo(
    () => findExactItem(query, itemsToSearch),
    [query, itemsToSearch],
  );

  function selectItem(itemId: ItemId | null) {
    onSelect(itemId);
    setIsOpen(false);
    setActiveIndex(0);
  }

  function handleChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    setActiveIndex(0);

    if (value.trim() === "") {
      onSelect(null);
    }
  }

  function handleBlur() {
    const matchedItem = findExactItem(query, itemsToSearch);
    if (matchedItem) {
      onSelect(matchedItem.vnum);
    }

    window.setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(0);
      setQuery(
        matchedItem || selectedItem ? getItemDisplayName(matchedItem ?? selectedItem) : "",
      );
    }, 100);
  }

  return (
    <div className="autocomplete">
      {exactMatch ? (
        <span className="autocomplete-prefix" aria-hidden="true">
          <ItemIcon
            itemId={exactMatch.vnum}
            name={getItemDisplayName(exactMatch)}
            size={18}
          />
        </span>
      ) : null}
      <input
        className="autocomplete-input"
        value={query}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onBlur={handleBlur}
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
            setQuery(getItemDisplayName(item));
            selectItem(item.vnum);
          }

          if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(0);
            setQuery(selectedItem ? getItemDisplayName(selectedItem) : "");
          }
        }}
        aria-label="Keresett tárgy"
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
                  setQuery(getItemDisplayName(item));
                  selectItem(item.vnum);
                }}
              >
                <span>
                  <ItemIcon
                    itemId={item.vnum}
                    name={getItemDisplayName(item)}
                  />{" "}
                  {getItemDisplayName(item)}
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
