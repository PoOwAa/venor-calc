import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const rawOutputDir = path.join(rootDir, "data");
const shopsJsonPath = path.join(rawOutputDir, "shops.json");
const vendorsDir = path.join(rootDir, "src", "data", "vendors");
const recipesFilePath = path.join(rootDir, "src", "data", "recipes.ts");

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

function getVendorFileContent(vendorName, vendorNpcVnum, recipes) {
  return `import type { Recipe } from "../../types/domain";

export const vendorName = ${JSON.stringify(vendorName)};
export const vendorNpcVnum = ${vendorNpcVnum};

export const recipes: Recipe[] = ${JSON.stringify(recipes, null, 2)};
`;
}

function getVendorsIndexContent(vendors) {
  const imports = vendors
    .map(
      ({ slug, importedName }) =>
        `import { recipes as ${importedName} } from "./${slug}";`,
    )
    .join("\n");

  const groups = vendors
    .map(
      ({ importedName, vendorName, vendorNpcVnum }) =>
        `  { vendorName: ${JSON.stringify(vendorName)}, vendorNpcVnum: ${vendorNpcVnum}, recipes: ${importedName} },`,
    )
    .join("\n");

  return `import type { Recipe } from "../../types/domain";
${imports}

export const vendorRecipeGroups = [
${groups}
] as const;

export const recipes: Recipe[] = vendorRecipeGroups.flatMap((group) => group.recipes);
`;
}

function toRecipe(vendorSlug, vendorName, vendorNpcVnum, offer, offerIndex) {
  const outputItemId = Number(offer?.item_vnum ?? 0);
  const outputQuantity = Number(offer?.count ?? 1);
  const inputs = [];
  let goldCost = 0;

  for (const price of offer?.prices ?? []) {
    const priceType = Number(price?.price_type ?? 0);
    const amount = Number(price?.amount ?? 0);
    const priceVnum = Number(price?.price_vnum ?? 0);

    if (priceType === 3 && priceVnum > 0 && amount > 0) {
      inputs.push({ itemId: priceVnum, quantity: amount });
    }

    if (priceType === 1 && Number.isFinite(amount)) {
      goldCost += amount;
    }
  }

  return {
    id: `${vendorSlug}-${outputItemId}-${offer?.order ?? offerIndex}`,
    npc: vendorName,
    vendor: vendorName,
    vendorNpcVnum,
    label: `${vendorName} • ${outputItemId}`,
    inputs,
    output: {
      itemId: outputItemId,
      quantity: outputQuantity,
    },
    goldCost,
  };
}

async function writeVendorRecipes(shops) {
  const uniqueVendors = new Map();

  for (const shop of shops) {
    if (Number(shop?.npc_vnum ?? 0) === 20503) {
      continue;
    }

    const vendorKey = `${shop?.npc_vnum ?? 0}|${shop?.npc_name ?? "vendor"}`;
    const currentVendor = uniqueVendors.get(vendorKey) ?? {
      npc_vnum: shop?.npc_vnum ?? 0,
      npc_name: shop?.npc_name || `Vendor ${shop?.npc_vnum ?? 0}`,
      offers: [],
    };

    currentVendor.offers.push(...(shop?.offers ?? []));
    uniqueVendors.set(vendorKey, currentVendor);
  }

  const vendors = Array.from(uniqueVendors.values())
    .map((shop) => {
      const vendorName = shop.npc_name || `Vendor ${shop.npc_vnum ?? 0}`;
      const vendorNpcVnum = Number(shop.npc_vnum ?? 0);
      const slug = `${slugify(vendorName)}-${vendorNpcVnum}`;
      const recipes = (shop.offers ?? []).map((offer, offerIndex) =>
        toRecipe(slug, vendorName, vendorNpcVnum, offer, offerIndex),
      );

      return {
        slug,
        importedName: `vendorRecipes_${slug.replace(/-/g, "_")}`,
        vendorName,
        vendorNpcVnum,
        recipes,
      };
    })
    .sort((left, right) => left.slug.localeCompare(right.slug, "en"));

  await fs.rm(vendorsDir, { recursive: true, force: true });
  await fs.mkdir(vendorsDir, { recursive: true });

  await Promise.all(
    vendors.map(({ slug, vendorName, vendorNpcVnum, recipes }) => {
      const filePath = path.join(vendorsDir, `${slug}.ts`);
      const fileContent = getVendorFileContent(
        vendorName,
        vendorNpcVnum,
        recipes,
      );
      return fs.writeFile(filePath, fileContent);
    }),
  );

  await fs.writeFile(
    path.join(vendorsDir, "index.ts"),
    getVendorsIndexContent(vendors),
  );
  await fs.writeFile(recipesFilePath, 'export { recipes } from "./vendors";\n');

  console.log(`Regenerated ${vendors.length} vendor files in ${vendorsDir}`);
}

async function downloadShops() {
  const url = "https://wiki.venor2.hu/api/shops?locale=hu";
  const headers = {
    accept: "*/*",
    "accept-language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
    priority: "u=1, i",
    referer: "https://wiki.venor2.hu/npc-shops",
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
    throw new Error(`Failed to fetch shops: ${response.status}`);
  }

  const shops = await response.json();

  if (!Array.isArray(shops)) {
    throw new TypeError("Expected wiki shops endpoint to return an array");
  }

  await fs.mkdir(rawOutputDir, { recursive: true });
  await fs.writeFile(shopsJsonPath, JSON.stringify(shops, null, 2));

  console.log(`Downloaded ${shops.length} shops to ${shopsJsonPath}`);

  await writeVendorRecipes(shops);
}

downloadShops().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
