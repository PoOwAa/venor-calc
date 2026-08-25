import { items } from "../data/items";

export interface ParsedOcrDropLine {
  rawName: string;
  quantity: number;
  sourceLine: string;
}

export interface ParsedOcrResult {
  openedBoxCount: number | null;
  drops: ParsedOcrDropLine[];
}

export interface MatchedOcrDropLine extends ParsedOcrDropLine {
  matchedItemId: number | null;
  matchedItemName: string | null;
  confidence: number;
  needsReview: boolean;
}

const REVIEW_THRESHOLD = 0.82;
const NO_MATCH_THRESHOLD = 0.55;

interface ItemLookupEntry {
  id: number;
  name: string;
  normalizedName: string;
}

const itemLookup: ItemLookupEntry[] = items.map((item) => ({
  id: item.vnum,
  name: item.locale_name || item.name,
  normalizedName: normalizeText(item.locale_name || item.name),
}));

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseBoxOcrText(rawText: string): ParsedOcrResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let openedBoxCount: number | null = null;
  for (const line of lines) {
    const normalized = normalizeText(line);
    const match = normalized.match(/kinyitottal\s+(\d+)\s+ladat?/);
    if (match) {
      openedBoxCount = Number(match[1]);
      break;
    }
  }

  const startIndex = lines.findIndex((line) => {
    const normalized = normalizeText(line);
    return normalized.includes("eredmeny");
  });

  const candidateLines = startIndex >= 0 ? lines.slice(startIndex + 1) : lines;

  const drops: ParsedOcrDropLine[] = [];
  for (const line of candidateLines) {
    const parsed = parseDropLine(line);
    if (parsed) {
      drops.push(parsed);
    }
  }

  return {
    openedBoxCount,
    drops,
  };
}

export function matchDropsToKnownItems(
  drops: ParsedOcrDropLine[],
): MatchedOcrDropLine[] {
  return drops.map((drop) => {
    const normalizedDropName = normalizeText(drop.rawName);

    let bestMatch: ItemLookupEntry | null = null;
    let bestScore = 0;

    for (const candidate of itemLookup) {
      const score = scoreNameSimilarity(
        normalizedDropName,
        candidate.normalizedName,
      );
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (!bestMatch || bestScore < NO_MATCH_THRESHOLD) {
      return {
        ...drop,
        matchedItemId: null,
        matchedItemName: null,
        confidence: bestScore,
        needsReview: true,
      };
    }

    return {
      ...drop,
      matchedItemId: bestMatch.id,
      matchedItemName: bestMatch.name,
      confidence: bestScore,
      needsReview: bestScore < REVIEW_THRESHOLD,
    };
  });
}

function parseDropLine(line: string): ParsedOcrDropLine | null {
  const compact = line
    .replace(/[\[\](){}<>]+/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[.,;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact || /^(?:[a-zA-Z]{1,2}|[\p{P}\p{S}]+)$/u.test(compact)) {
    return null;
  }

  const quantityMatch = compact.match(
    /^(.+?)\s*(?:[-–—:=~]|\s+)\s*([0-9]+)\s*$/u,
  );
  if (!quantityMatch) {
    return null;
  }

  const rawName = quantityMatch[1]
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "")
    .trim();

  if (!rawName || /^\d+$/.test(rawName)) {
    return null;
  }

  return {
    rawName,
    quantity: Number(quantityMatch[2]),
    sourceLine: line,
  };
}

function scoreNameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const levScore = levenshteinSimilarity(a, b);
  const tokenScore = tokenOverlapScore(a, b);
  const containsBonus = a.includes(b) || b.includes(a) ? 0.1 : 0;

  return Math.min(1, Math.max(levScore, tokenScore) + containsBonus);
}

function tokenOverlapScore(a: string, b: string): number {
  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = b.split(" ").filter(Boolean);
  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  const bTokenSet = new Set(bTokens);
  const intersection = aTokens.filter((token) => bTokenSet.has(token)).length;
  return intersection / Math.max(aTokens.length, bTokens.length);
}

function levenshteinSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );

  for (let i = 0; i < rows; i += 1) table[i][0] = i;
  for (let j = 0; j < cols; j += 1) table[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      table[i][j] = Math.min(
        table[i - 1][j] + 1,
        table[i][j - 1] + 1,
        table[i - 1][j - 1] + cost,
      );
    }
  }

  return table[rows - 1][cols - 1];
}
