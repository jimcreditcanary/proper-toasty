// One-shot: rasterise src/app/icon.svg to a multi-size favicon.ico at
// src/app/favicon.ico. Next 13+ auto-serves any favicon.ico in the app
// directory at /favicon.ico — that's what browsers default-request and
// what was 404'ing in production.
//
// Usage:  node scripts/build-favicon.mjs
//
// Re-run whenever the brand mark in icon.svg changes.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SVG_PATH = resolve(ROOT, "src/app/icon.svg");
const ICO_PATH = resolve(ROOT, "src/app/favicon.ico");

// ICO format wants multiple sizes packed together. 16/32/48 covers
// taskbar / tab / desktop shortcut. Browsers usually pick the
// best-fit at runtime.
const SIZES = [16, 32, 48];

// Minimal ICO encoder. ICO is "ICONDIR + N × ICONDIRENTRY + N × image
// payload". We embed each size as a PNG (modern Windows + browsers
// handle PNG-in-ICO fine; smaller files than BMP, no quirky masking).
async function buildIco() {
  const svg = readFileSync(SVG_PATH);
  const pngs = await Promise.all(
    SIZES.map(async (size) => {
      const png = await sharp(svg, { density: 300 })
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toBuffer();
      return { size, png };
    }),
  );

  const HEADER_SIZE = 6; // ICONDIR
  const ENTRY_SIZE = 16; // ICONDIRENTRY each

  // Header
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(SIZES.length, 4); // number of images

  // Entries point at offsets after the directory
  const entries = Buffer.alloc(ENTRY_SIZE * SIZES.length);
  let offset = HEADER_SIZE + ENTRY_SIZE * SIZES.length;
  pngs.forEach(({ size, png }, i) => {
    const e = entries.subarray(i * ENTRY_SIZE, (i + 1) * ENTRY_SIZE);
    // 0 in width/height means 256+ in ICO; we always use ≤48 so write
    // the literal size.
    e.writeUInt8(size === 256 ? 0 : size, 0); // width
    e.writeUInt8(size === 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // colour palette (0 = none)
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8); // image data size
    e.writeUInt32LE(offset, 12); // offset to image data
    offset += png.length;
  });

  const ico = Buffer.concat([header, entries, ...pngs.map((p) => p.png)]);
  writeFileSync(ICO_PATH, ico);
  console.log(`✅ wrote ${ICO_PATH} (${ico.length} bytes, sizes: ${SIZES.join(", ")})`);
}

buildIco().catch((e) => {
  console.error(e);
  process.exit(1);
});
