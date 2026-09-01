import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const rawOutputDir = path.join(rootDir, "data");
const itemsJsonPath = path.join(rawOutputDir, "items.json");
const byTypeOutputDir = path.join(rootDir, "src", "data", "items", "byType");
const itemsIndexPath = path.join(rootDir, "src", "data", "items.ts");

function getItemType(item) {
  return String(item?.type || "ITEM_NONE");
}

function createTypeFileContent(typeName, items) {
  return `import type { Item } from "../../../types/domain";

export const ${typeName}Items: Item[] = ${JSON.stringify(items, null, 2)};
`;
}

function createItemsIndexContent(typeNames) {
  const imports = typeNames
    .map(
      (typeName) =>
        `import { ${typeName}Items } from "./items/byType/${typeName}";`,
    )
    .join("\n");

  const itemSpreads = typeNames
    .map((typeName) => `  ...${typeName}Items,`)
    .join("\n");

  return `import type { Item } from "../types/domain";
${imports}

export const items: Item[] = [
${itemSpreads}
];

export const itemById = Object.fromEntries(items.map((item) => [item.vnum, item]));
`;
}

async function writeItemsByType(items) {
  const itemsByType = new Map();

  for (const item of items) {
    const typeName = getItemType(item);
    const currentItems = itemsByType.get(typeName) ?? [];
    currentItems.push(item);
    itemsByType.set(typeName, currentItems);
  }

  const typeNames = Array.from(itemsByType.keys()).sort();

  await fs.rm(byTypeOutputDir, { recursive: true, force: true });
  await fs.mkdir(byTypeOutputDir, { recursive: true });

  await Promise.all(
    typeNames.map((typeName) => {
      const filePath = path.join(byTypeOutputDir, `${typeName}.ts`);
      const fileContent = createTypeFileContent(
        typeName,
        itemsByType.get(typeName),
      );
      return fs.writeFile(filePath, fileContent);
    }),
  );

  await fs.writeFile(itemsIndexPath, createItemsIndexContent(typeNames));

  console.log(
    `Regenerated ${typeNames.length} item type files in ${byTypeOutputDir}`,
  );
}

async function downloadItems() {
  const url = `https://wiki.venor2.hu/api/items?locale=hu`;
  const headers = {
    accept: "*/*",
    "accept-language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
    "if-none-match": 'W/"1b655f-bdOhIEBTUvA4ntxIk5z3jP8HUW4"',
    priority: "u=1, i",
    referer: "https://wiki.venor2.hu/",
    "sec-ch-ua":
      '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.status}`);
  }

  const items = await response.json();

  if (!Array.isArray(items)) {
    throw new TypeError("Expected wiki items endpoint to return an array");
  }

  await fs.mkdir(rawOutputDir, { recursive: true });
  await fs.writeFile(itemsJsonPath, JSON.stringify(items, null, 2));

  console.log(`Downloaded ${items.length} items to ${itemsJsonPath}`);

  await writeItemsByType(items);
}

downloadItems().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
