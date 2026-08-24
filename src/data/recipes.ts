import type { Recipe } from "../types/domain";

export const recipes: Recipe[] = [
  {
    id: "legendary-from-raw",
    npc: "Alkimista",
    label: "Cor Draconis (Nyers) -> Cor Draconis (Legendás)",
    inputs: [{ itemId: 50255, quantity: 95 }],
    output: { itemId: 50259, quantity: 1 },
    goldCost: 5_000_000,
  },
  {
    id: "legendary-from-cut",
    npc: "Alkimista",
    label: "Legendás Cor Metszettből",
    inputs: [{ itemId: 50256, quantity: 40 }],
    output: { itemId: 50259, quantity: 1 },
    goldCost: 10_000_000,
  },
  {
    id: "legendary-from-rare",
    npc: "Alkimista",
    label: "Legendás Cor Ritkából",
    inputs: [{ itemId: 50257, quantity: 14 }],
    output: { itemId: 50259, quantity: 1 },
    goldCost: 15_000_000,
  },
  {
    id: "legendary-from-antique",
    npc: "Alkimista",
    label: "Legendás Cor Antikból",
    inputs: [{ itemId: 50258, quantity: 5 }],
    output: { itemId: 50259, quantity: 1 },
    goldCost: 20_000_000,
  },
  {
    id: "raw-from-wind-crystal",
    npc: "Elementális Kereskedő (Szél)",
    label: "Nyers Cor Szél kristályból",
    inputs: [{ itemId: 230042, quantity: 1 }],
    output: { itemId: 50255, quantity: 50 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-ritual-stone",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél kristály Rituális kőből",
    inputs: [{ itemId: 25042, quantity: 3 }],
    output: { itemId: 230042, quantity: 2 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-wind-shard",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Kő-töredék és Szél kristálytöredékből",
    inputs: [
      {
        itemId: 230012,
        quantity: 10,
      },
      {
        itemId: 230041,
        quantity: 200,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 100_000_000,
  },
  {
    id: "wind-crystal-from-zen-beans",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Zen-babból",
    inputs: [
      {
        itemId: 70102,
        quantity: 2_000,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-concentrated-reading",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Koncentrált olvasásból",
    inputs: [
      {
        itemId: 39030,
        quantity: 1000,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-exorcism-scroll",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Ördögűző tekercsből",
    inputs: [
      {
        itemId: 71001,
        quantity: 1000,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-magenta-pearl",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Magenta Gyöngyből",
    inputs: [
      {
        itemId: 230010,
        quantity: 10,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-moonstone",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Holdkőből",
    inputs: [
      {
        itemId: 30618,
        quantity: 1,
      },
    ],
    output: { itemId: 230042, quantity: 2 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-blue-belt",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Kék övből",
    inputs: [
      {
        itemId: 30550,
        quantity: 1,
      },
    ],
    output: { itemId: 230042, quantity: 2 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-stone-shard",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Kő-töredékből",
    inputs: [
      {
        itemId: 230012,
        quantity: 1000,
      },
    ],
    output: { itemId: 230042, quantity: 3 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-fine-cloth",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Finom Kelméből",
    inputs: [
      {
        itemId: 80019,
        quantity: 1000,
      },
    ],
    output: { itemId: 230042, quantity: 8 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-pvm-glove-scroll",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Kesztyű tekercs (PvM)-ből",
    inputs: [
      {
        itemId: 250000,
        quantity: 1,
      },
    ],
    output: { itemId: 230042, quantity: 5 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-elemental-flower",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Elementáris virágból",
    inputs: [
      {
        itemId: 33031,
        quantity: 20,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-zodiac-emblem",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Zodiákus jelvényből",
    inputs: [
      {
        itemId: 230090,
        quantity: 3,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-zodiac-scroll",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Zodiákus pergamenből",
    inputs: [
      {
        itemId: 230089,
        quantity: 12,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "wind-crystal-from-wind-token",
    npc: "Elementális Kereskedő (Szél)",
    label: "Szél Kristály Szél tokenből",
    inputs: [
      {
        itemId: 230053,
        quantity: 1,
      },
    ],
    output: { itemId: 230042, quantity: 1 },
    goldCost: 0,
  },
  {
    id: "ritual-stone-from-magic-stone",
    npc: "Kovács",
    label: "Rituális kő 3 Mágikus kőből",
    inputs: [{ itemId: 25041, quantity: 3 }],
    output: { itemId: 25042, quantity: 1 },
    goldCost: 150_000_000,
  },
  {
    id: "ritual-stone-from-magic-stone-2",
    npc: "Kovács",
    label: "Rituális kő Mágikus kőből",
    inputs: [{ itemId: 25041, quantity: 1 }],
    output: { itemId: 25042, quantity: 1 },
    goldCost: 300_000_000,
  },
  {
    id: "magic-stone-from-smith-stone",
    npc: "Kovács",
    label: "Mágikus kő Kovács kőből",
    inputs: [{ itemId: 39015, quantity: 5 }],
    output: { itemId: 25041, quantity: 1 },
    goldCost: 10_000_000,
  },
];
