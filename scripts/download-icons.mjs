import fs from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = "./data/icon-manifest.json";
const OUTPUT_DIR = "./public/items";

const ICON_BASE_URL = "https://wiki.venor2.hu/assets/icons/";

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
  const outputPath = path.join(OUTPUT_DIR, `${itemId}.png`);

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
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
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

async function main() {
  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));

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
