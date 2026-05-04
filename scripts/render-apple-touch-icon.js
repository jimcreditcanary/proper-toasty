// Renders public/icon.svg → public/apple-touch-icon.png (180×180,
// cream background) so iOS Safari + a handful of other browsers
// don't 404 when they speculatively request /apple-touch-icon.png.
//
// Run after touching public/icon.svg:
//   node scripts/render-apple-touch-icon.js
//
// Sharp is already a devDependency for image processing elsewhere
// in the project, so this doesn't add a new dep.

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "public", "icon.svg");
const DEST = path.join(__dirname, "..", "public", "apple-touch-icon.png");
const SIZE = 180;
const BACKGROUND = { r: 250, g: 247, b: 242, alpha: 1 }; // cream

async function main() {
  const svg = fs.readFileSync(SRC);
  await sharp(svg)
    .resize(SIZE, SIZE, { fit: "contain", background: BACKGROUND })
    .png()
    .toFile(DEST);
  console.log(`Wrote ${path.relative(process.cwd(), DEST)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
