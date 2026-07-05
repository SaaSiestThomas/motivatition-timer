// Rasterize the brand SVGs into the PNG icons the PWA manifest and iOS need.
// Run with: npm run icons   (uses sharp, a devDependency)
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const outDir = join(publicDir, "icons");
mkdirSync(outDir, { recursive: true });

const standard = readFileSync(join(publicDir, "favicon.svg"));
const maskable = readFileSync(join(publicDir, "icon-maskable.svg"));

const jobs = [
  { src: standard, size: 192, out: "icon-192.png" },
  { src: standard, size: 512, out: "icon-512.png" },
  { src: standard, size: 180, out: "apple-touch-icon.png" },
  { src: maskable, size: 512, out: "icon-maskable-512.png" },
];

await Promise.all(
  jobs.map(({ src, size, out }) =>
    sharp(src, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(join(outDir, out))
      .then(() => console.log(`wrote icons/${out} (${size}x${size})`)),
  ),
);
