import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const shopsPath = path.join(rootDir, "data", "shops.json");
const vendorsDir = path.join(rootDir, "src", "data", "vendors");

fs.mkdirSync(vendorsDir, { recursive: true });

const shops = JSON.parse(fs.readFileSync(shopsPath, "utf8"));

const uniqueVendors = new Map();
for (const shop of shops) {
  const vendorKey = `${shop.npc_vnum ?? 0}|${shop.npc_name ?? "vendor"}`;
  const current = uniqueVendors.get(vendorKey) ?? {
    npc_vnum: shop.npc_vnum ?? 0,
    npc_name: shop.npc_name || `Vendor ${shop.npc_vnum ?? 0}`,
    offers: [],
  };

  current.offers.push(...(shop.offers ?? []));
  uniqueVendors.set(vendorKey, current);
}

function slugify(value) {
  const normalized = String(value ?? "vendor")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

  return normalized || "vendor";
}

const vendorImports = [];
const vendorGroups = [];

for (const shop of uniqueVendors.values()) {
  const vendorName = shop.npc_name || `Vendor ${shop.npc_vnum ?? 0}`;
  const vendorSlug = `${slugify(vendorName)}-${shop.npc_vnum ?? 0}`;
  const vendorFilePath = path.join(vendorsDir, `${vendorSlug}.ts`);

  const recipes = (shop.offers ?? []).map((offer, offerIndex) => {
    const outputItemId = Number(offer.item_vnum ?? 0);
    const outputQuantity = Number(offer.count ?? 1);
    const inputs = [];
    let goldCost = 0;

    for (const price of offer.prices ?? []) {
      const priceType = Number(price.price_type ?? 0);
      const amount = Number(price.amount ?? 0);
      const priceVnum = Number(price.price_vnum ?? 0);

      if (priceType === 3 && priceVnum > 0 && amount > 0) {
        inputs.push({ itemId: priceVnum, quantity: amount });
      }

      if (priceType === 1 && Number.isFinite(amount)) {
        goldCost += amount;
      }
    }

    return {
      id: `${vendorSlug}-${outputItemId}-${offer.order ?? offerIndex}`,
      npc: vendorName,
      vendor: vendorName,
      vendorNpcVnum: Number(shop.npc_vnum ?? 0),
      label: `${vendorName} • ${outputItemId}`,
      inputs,
      output: {
        itemId: outputItemId,
        quantity: outputQuantity,
      },
      goldCost,
    };
  });

  const vendorFileContent = `import type { Recipe } from "../../types/domain";

export const vendorName = ${JSON.stringify(vendorName)};
export const vendorNpcVnum = ${Number(shop.npc_vnum ?? 0)};

export const recipes: Recipe[] = ${JSON.stringify(recipes, null, 2)};
`;

  fs.writeFileSync(vendorFilePath, vendorFileContent);

  vendorImports.push({
    slug: vendorSlug,
    importedName: `vendorRecipes_${vendorSlug.replace(/-/g, "_")}`,
    vendorName,
    npcVnum: Number(shop.npc_vnum ?? 0),
  });

  vendorGroups.push({
    vendorName,
    vendorNpcVnum: Number(shop.npc_vnum ?? 0),
    recipes,
  });
}

const uniqueVendorImports = Array.from(
  new Map(vendorImports.map((entry) => [entry.slug, entry])).values(),
);

const imports = uniqueVendorImports
  .map(
    ({ slug, importedName }) =>
      `import { recipes as ${importedName} } from "./${slug}";`,
  )
  .join("\n");

const groups = uniqueVendorImports
  .map(
    ({ importedName, vendorName, npcVnum }) =>
      `  { vendorName: ${JSON.stringify(vendorName)}, vendorNpcVnum: ${npcVnum}, recipes: ${importedName} },`,
  )
  .join("\n");

const aggregatedFileContent = `import type { Recipe } from "../../types/domain";
${imports}

export const vendorRecipeGroups = [
${groups}
] as const;

export const recipes: Recipe[] = vendorRecipeGroups.flatMap((group) => group.recipes);
`;

fs.writeFileSync(path.join(vendorsDir, "index.ts"), aggregatedFileContent);

const recipesFilePath = path.join(rootDir, "src", "data", "recipes.ts");
const recipesFileContent = `export { recipes } from "./vendors";\n`;
fs.writeFileSync(recipesFilePath, recipesFileContent);

console.log(`Generated ${shops.length} vendor recipe files in ${vendorsDir}`);
