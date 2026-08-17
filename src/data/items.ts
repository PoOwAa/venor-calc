import type { Item } from "../types/domain";

export const items: Item[] = [
  {
    id: "cor-raw",
    name: "Cor Draconis (Nyers)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: "cor-cut",
    name: "Cor Draconis (Metszett)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: "cor-rare",
    name: "Cor Draconis (Ritka)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: "cor-antique",
    name: "Cor Draconis (Antik)",
    tradable: true,
    category: "Cor Draconis",
  },
  {
    id: "cor-legendary",
    name: "Cor Draconis (legendás)",
    tradable: false,
    category: "Cor Draconis",
  },
  {
    id: "wind-crystal",
    name: "Szél kristály",
    tradable: true,
    category: "Event",
  },
  {
    id: "ritual-stone",
    name: "Rituális kő",
    tradable: true,
    category: "Fejlesztés",
  },
  {
    id: "magic-stone",
    name: "Mágikus kő",
    tradable: true,
    category: "Fejlesztés",
  },
  {
    id: "smith-stone",
    name: "Kovács köve",
    tradable: true,
    category: "Fejlesztés",
  },
];

export const itemById = Object.fromEntries(
  items.map((item) => [item.id, item]),
);
