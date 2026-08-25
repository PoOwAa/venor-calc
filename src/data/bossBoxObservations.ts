import type { ItemId } from "../types/domain";

export interface BoxDropObservation {
  itemId: ItemId;
  quantity: number;
}

export interface BoxOpeningSample {
  boxItemId: ItemId;
  openedBoxCount?: number;
  drops: BoxDropObservation[];
}

// Nyers, játékosoktól gyűjtött felnyitási minták.
export const boxOpeningSamples: BoxOpeningSample[] = [
  {
    boxItemId: 50082,
    drops: [
      { itemId: 70102, quantity: 400 },
      { itemId: 39030, quantity: 40 },
      { itemId: 230012, quantity: 45 },
    ],
  },
  {
    boxItemId: 50082,
    drops: [
      { itemId: 71001, quantity: 50 },
      { itemId: 230010, quantity: 1 },
    ],
  },
  {
    boxItemId: 50082,
    drops: [{ itemId: 80019, quantity: 45 }],
  },
  {
    boxItemId: 50074,
    drops: [
      { itemId: 70102, quantity: 450 },
      { itemId: 39030, quantity: 35 },
    ],
  },
  {
    boxItemId: 50074,
    drops: [
      { itemId: 71001, quantity: 60 },
      { itemId: 230012, quantity: 35 },
    ],
  },
  {
    boxItemId: 50074,
    drops: [{ itemId: 33031, quantity: 1 }],
  },
  {
    boxItemId: 50186,
    drops: [
      { itemId: 230089, quantity: 2 },
      { itemId: 230090, quantity: 1 },
    ],
  },
  {
    boxItemId: 50186,
    drops: [
      { itemId: 70102, quantity: 700 },
      { itemId: 39030, quantity: 90 },
    ],
  },
  {
    boxItemId: 50186,
    drops: [{ itemId: 230010, quantity: 2 }],
  },
  {
    boxItemId: 54705,
    drops: [
      { itemId: 230053, quantity: 1 },
      { itemId: 80019, quantity: 60 },
    ],
  },
  {
    boxItemId: 54705,
    drops: [
      { itemId: 33031, quantity: 2 },
      { itemId: 230012, quantity: 60 },
    ],
  },
  {
    boxItemId: 54705,
    drops: [{ itemId: 70102, quantity: 900 }],
  },
  {
    boxItemId: 50270,
    drops: [
      { itemId: 230090, quantity: 2 },
      { itemId: 230089, quantity: 4 },
    ],
  },
  {
    boxItemId: 50270,
    drops: [
      { itemId: 33031, quantity: 2 },
      { itemId: 39030, quantity: 130 },
    ],
  },
  {
    boxItemId: 50270,
    drops: [
      { itemId: 71001, quantity: 110 },
      { itemId: 230012, quantity: 70 },
    ],
  },
];
