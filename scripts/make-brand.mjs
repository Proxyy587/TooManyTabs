// Generates extension icons + logo from src/brand/pip.json.
//   node scripts/make-brand.mjs
// Chrome does not accept SVG for manifest icons, so we emit real PNGs at
// 16/32/48/128 (integer multiples of the 16px grid, so every pixel stays crisp).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gridToPng, gridToSvg } from "./pixel-png.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { grid, palette } = JSON.parse(fs.readFileSync(path.join(root, "src/brand/pip.json"), "utf8"));

if (grid.length !== 16 || grid.some((r) => r.length !== 16)) throw new Error("pip grid must be 16x16");
for (const row of grid) for (const ch of row) if (ch !== "." && !palette[ch]) throw new Error(`unknown colour key ${ch}`);

const iconsDir = path.join(root, "public/icons");
fs.mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), gridToPng(grid, palette, size));
}
fs.mkdirSync(path.join(root, "public/brand"), { recursive: true });
fs.writeFileSync(path.join(root, "public/brand/pip.svg"), gridToSvg(grid, palette, { title: "Pip, the TooManyTabs mascot" }));
fs.writeFileSync(path.join(root, "public/brand/pip-512.png"), gridToPng(grid, palette, 512));
console.log("[brand] wrote public/icons/icon-{16,32,48,128}.png, public/brand/pip.svg, public/brand/pip-512.png");
