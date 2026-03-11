#!/usr/bin/env node
/**
 * Generate PWA icon PNGs from the source SVG.
 * Run: node scripts/generate-icons.mjs
 * Requires: sharp (already in node_modules via Next.js)
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svg = readFileSync(resolve(root, "public/icon.svg"));

async function generate() {
  // Standard icons
  await sharp(svg).resize(192, 192).png().toFile(resolve(root, "public/icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(resolve(root, "public/icon-512.png"));

  // Maskable icon: inner 80% safe zone, padded with chalkboard background
  const size = 512;
  const padding = Math.round(size * 0.1);
  const inner = size - padding * 2;
  const resized = await sharp(svg).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 26, b: 24, alpha: 1 },
    },
  })
    .composite([{ input: resized, left: padding, top: padding }])
    .png()
    .toFile(resolve(root, "public/icon-maskable-512.png"));

  // Apple touch icon (180x180)
  await sharp(svg).resize(180, 180).png().toFile(resolve(root, "public/apple-touch-icon.png"));

  console.log("PWA icons generated successfully:");
  console.log("  public/icon-192.png");
  console.log("  public/icon-512.png");
  console.log("  public/icon-maskable-512.png");
  console.log("  public/apple-touch-icon.png");
}

generate().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
