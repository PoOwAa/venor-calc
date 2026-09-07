import type { Recipe } from "../../types/domain";

export const vendorName = "Mészáros Arthúr";
export const vendorNpcVnum = 60326;

export const recipes: Recipe[] = [
  {
    "id": "meszaros-arthur-60326-230046-1",
    "npc": "Mészáros Arthúr",
    "vendor": "Mészáros Arthúr",
    "vendorNpcVnum": 60326,
    "label": "Mészáros Arthúr • 230046",
    "inputs": [
      {
        "itemId": 230045,
        "quantity": 400
      },
      {
        "itemId": 230012,
        "quantity": 20
      }
    ],
    "output": {
      "itemId": 230046,
      "quantity": 1
    },
    "goldCost": 200000000
  }
];
