import type { Recipe } from "../../types/domain";

export const vendorName = "Deokbae";
export const vendorNpcVnum = 20015;

export const recipes: Recipe[] = [
  {
    "id": "deokbae-20015-29101-1",
    "npc": "Deokbae",
    "vendor": "Deokbae",
    "vendorNpcVnum": 20015,
    "label": "Deokbae • 29101",
    "inputs": [],
    "output": {
      "itemId": 29101,
      "quantity": 1
    },
    "goldCost": 500000000
  },
  {
    "id": "deokbae-20015-50600-2",
    "npc": "Deokbae",
    "vendor": "Deokbae",
    "vendorNpcVnum": 20015,
    "label": "Deokbae • 50600",
    "inputs": [
      {
        "itemId": 71001,
        "quantity": 500
      },
      {
        "itemId": 39030,
        "quantity": 500
      },
      {
        "itemId": 70102,
        "quantity": 500
      }
    ],
    "output": {
      "itemId": 50600,
      "quantity": 1
    },
    "goldCost": 200000000
  },
  {
    "id": "deokbae-20015-250035-3",
    "npc": "Deokbae",
    "vendor": "Deokbae",
    "vendorNpcVnum": 20015,
    "label": "Deokbae • 250035",
    "inputs": [
      {
        "itemId": 50634,
        "quantity": 10
      },
      {
        "itemId": 240159,
        "quantity": 100
      }
    ],
    "output": {
      "itemId": 250035,
      "quantity": 1
    },
    "goldCost": 500000000
  },
  {
    "id": "deokbae-20015-240165-4",
    "npc": "Deokbae",
    "vendor": "Deokbae",
    "vendorNpcVnum": 20015,
    "label": "Deokbae • 240165",
    "inputs": [
      {
        "itemId": 240159,
        "quantity": 5
      },
      {
        "itemId": 230123,
        "quantity": 10
      }
    ],
    "output": {
      "itemId": 240165,
      "quantity": 1
    },
    "goldCost": 200000000
  }
];
