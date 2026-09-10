import type { Recipe } from "../../types/domain";

export const vendorName = "Természet hercegnője";
export const vendorNpcVnum = 60277;

export const recipes: Recipe[] = [
  {
    "id": "termeszet-hercegnoje-60277-230046-1",
    "npc": "Természet hercegnője",
    "vendor": "Természet hercegnője",
    "vendorNpcVnum": 60277,
    "label": "Természet hercegnője • 230046",
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
