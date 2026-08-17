import type { Item } from "../types/domain";

export const items: Item[] = [
  {
    id: 50255,
    name: "Cor Draconis (Nyers)",
    tradable: true,
    category: "Cor Draconis",
    defaultMarketPrice: 10_000_000,
  },
  {
    id: 50256,
    name: "Cor Draconis (Metszett)",
    tradable: true,
    category: "Cor Draconis",
    defaultMarketPrice: 20_000_000,
  },
  {
    id: 50257,
    name: "Cor Draconis (Ritka)",
    tradable: true,
    category: "Cor Draconis",
    defaultMarketPrice: 60_000_000,
  },
  {
    id: 50258,
    name: "Cor Draconis (Antik)",
    tradable: true,
    category: "Cor Draconis",
    defaultMarketPrice: 170_000_000,
  },
  {
    id: 50259,
    name: "Cor Draconis (legendás)",
    tradable: true,
    category: "Cor Draconis",
    defaultMarketPrice: 950_000_000,
  },
  {
    id: 70102,
    name: "Zen-bab",
    tradable: true,
    category: "Általános",
    defaultMarketPrice: 250_000,
  },
  {
    id: 230012,
    name: "Kő-töredék",
    tradable: true,
    category: "Általános",
    defaultMarketPrice: 1_800_000,
  },
  {
    id: 230041,
    name: "Szél kristálytöredék",
    tradable: true,
    category: "Event",
    defaultMarketPrice: 1_800_000,
  },
  {
    id: 230042,
    name: "Szél kristály",
    tradable: true,
    category: "Event",
    defaultMarketPrice: 400_000_000,
  },
  {
    id: 25042,
    name: "Rituális kő",
    tradable: true,
    category: "Fejlesztés",
    defaultMarketPrice: 300_000_000,
  },
  {
    id: 25041,
    name: "Mágikus kő",
    tradable: true,
    category: "Fejlesztés",
    defaultMarketPrice: 50_000_000,
  },
  {
    id: 39015,
    name: "Kovács köve",
    tradable: true,
    category: "Fejlesztés",
    defaultMarketPrice: 4_500_000,
  },
];

export const itemById = Object.fromEntries(
  items.map((item) => [item.id, item]),
);
