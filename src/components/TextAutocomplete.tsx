import { useMemo, useState } from "react";

interface TextAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  ariaLabel?: string;
}

const MAX_SUGGESTIONS = 8;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("hu-HU");
}

function rankSuggestions(query: string, options: string[]): string[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  return options
    .map((option) => {
      const normalizedOption = normalize(option);

      let score = Number.POSITIVE_INFINITY;
      if (normalizedOption === normalizedQuery) score = 0;
      else if (normalizedOption.startsWith(normalizedQuery)) score = 1;
      else if (normalizedOption.includes(normalizedQuery)) score = 2;

      return { option, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.score - b.score || a.option.localeCompare(b.option, "hu"))
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.option);
}

export function TextAutocomplete({
  value,
  onValueChange,
  suggestions,
  placeholder = "Kezdj el gépelni...",
  ariaLabel = "Szöveges kereső",
}: TextAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rankedSuggestions = useMemo(
    () => rankSuggestions(value, suggestions),
    [value, suggestions],
  );

  function selectOption(option: string) {
    onValueChange(option);
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
          window.setTimeout(() => {
            setIsOpen(false);
            setActiveIndex(0);
          }, 100);
        }}
        onKeyDown={(event) => {
          if (
            !isOpen &&
            event.key === "ArrowDown" &&
            rankedSuggestions.length > 0
          ) {
            setIsOpen(true);
            return;
          }

          if (event.key === "ArrowDown" && rankedSuggestions.length > 0) {
            event.preventDefault();
            setActiveIndex((current) =>
              Math.min(current + 1, rankedSuggestions.length - 1),
            );
          }

          if (event.key === "ArrowUp" && rankedSuggestions.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          }

          if (event.key === "Enter" && rankedSuggestions[activeIndex]) {
            event.preventDefault();
            selectOption(rankedSuggestions[activeIndex]);
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
          {rankedSuggestions.length === 0 ? (
            <div className="autocomplete-empty">Nincs találat.</div>
          ) : (
            rankedSuggestions.map((option, index) => (
              <button
                type="button"
                key={option}
                className={`autocomplete-option ${index === activeIndex ? "active" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
              >
                <span>{option}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
