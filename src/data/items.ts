import type { Item } from "../types/domain";

export const items: Item[] = [
  {
    id: 50255,
    name: "Cor Draconis (Nyers)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: 50256,
    name: "Cor Draconis (Metszett)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: 50257,
    name: "Cor Draconis (Ritka)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: 50258,
    name: "Cor Draconis (Antik)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: 50259,
    name: "Cor Draconis (legendás)",
    tradable: false,
    category: "Cor Draconis",
  },
  {
    id: 230042,
    name: "Szél kristály",
    tradable: true,
    category: "Event",
  },
  {
    id: 25042,
    name: "Rituális kő",
    tradable: true,
    category: "Fejlesztés",
  },
  {
    id: 25041,
    name: "Mágikus kő",
    tradable: true,
    category: "Fejlesztés",
  },
  {
    id: 39015,
    name: "Kovács köve",
    tradable: true,
    category: "Fejlesztés",
  },
];

export const itemById = Object.fromEntries(
  items.map((item) => [item.id, item]),
);
