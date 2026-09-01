import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const manifestPath = path.join(rootDir, "data", "icon-manifest.json");
const outputDir = path.join(rootDir, "public", "items");

const ICON_BASE_URL = "https://wiki.venor2.hu/assets/icons/";
const MANIFEST_URL = "https://wiki.venor2.hu/api/icon-manifest";

const MIN_DELAY = 10;
const MAX_DELAY = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () =>
  Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadIcon(itemId, filename) {
  const outputPath = path.join(outputDir, `${itemId}.png`);

  // Resume support
  if (await fileExists(outputPath)) {
    console.log(`⏭️  ${itemId} already exists`);
    return "skipped";
  }

  const url = `${ICON_BASE_URL}${filename}`;

  console.log(`⬇️  ${itemId}: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
      Referer: `https://wiki.venor2.hu/items/${itemId}`,
    },
  });

  // Don't hammer the server if it starts blocking us
  if (response.status === 403 || response.status === 429) {
    throw new Error(`Received HTTP ${response.status}. Stopping immediately.`);
  }

  if (!response.ok) {
    console.warn(`⚠️ ${itemId}: HTTP ${response.status}`);

    return "failed";
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.startsWith("image/")) {
    throw new Error(`${itemId}: Expected image but received ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.writeFile(outputPath, buffer);

  console.log(`✅ ${itemId}.png (${Math.round(buffer.length / 1024)} KB)`);

  return "downloaded";
}

async function downloadManifest() {
  const existingManifest = (await fileExists(manifestPath))
    ? JSON.parse(await fs.readFile(manifestPath, "utf8"))
    : null;

  const response = await fetch(MANIFEST_URL, {
    headers: {
      accept: "*/*",
      "accept-language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
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
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch icon manifest: ${response.status}`);
  }

  const manifest = await response.json();

  if (
    !manifest ||
    typeof manifest !== "object" ||
    typeof manifest.items !== "object"
  ) {
    throw new TypeError(
      "Expected icon manifest endpoint to return an object with an items map",
    );
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });

  if (existingManifest?.generatedAt === manifest.generatedAt) {
    console.log(
      `Downloaded icon manifest unchanged (${manifest.generatedAt}), keeping ${manifestPath}`,
    );

    return existingManifest;
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    `Downloaded icon manifest ${existingManifest?.generatedAt ?? "(new)"} -> ${manifest.generatedAt}`,
  );

  return manifest;
}

async function main() {
  await fs.mkdir(outputDir, {
    recursive: true,
  });

  const manifest = await downloadManifest();

  const entries = Object.entries(manifest.items);

  console.log(`Found ${entries.length} icons`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < entries.length; index++) {
    const [itemId, filename] = entries[index];

    try {
      const result = await downloadIcon(itemId, filename);

      if (result === "downloaded") {
        downloaded++;
      } else if (result === "skipped") {
        skipped++;
        continue;
      } else {
        failed++;
      }
    } catch (error) {
      console.error("\n🛑 Downloader stopped.");
      console.error(error);

      console.log({
        downloaded,
        skipped,
        failed,
      });

      process.exit(1);
    }

    console.log(`[${index + 1}/${entries.length}]`);

    // Only wait if there's another request coming
    if (index < entries.length - 1) {
      const delay = randomDelay();

      console.log(`💤 ${(delay / 1000).toFixed(1)}s`);

      await sleep(delay);
    }
  }

  console.log("\n🎉 Done!");

  console.log({
    downloaded,
    skipped,
    failed,
  });
}

main();
