import type { Recipe } from "../../types/domain";

export const vendorName = "Lovászinas";
export const vendorNpcVnum = 20349;

export const recipes: Recipe[] = [
  {
    "id": "lovaszinas-20349-230105-1",
    "npc": "Lovászinas",
    "vendor": "Lovászinas",
    "vendorNpcVnum": 20349,
    "label": "Lovászinas • 230105",
    "inputs": [
      {
        "itemId": 230106,
        "quantity": 500
      }
    ],
    "output": {
      "itemId": 230105,
      "quantity": 1
    },
    "goldCost": 200000000
  }
];
