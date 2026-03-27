/**
 * Convert all PNG/JPG/JPEG images in public/ and client/assets/ to WebP.
 * Keeps original files as backup (.original extension).
 * Outputs a before/after size comparison.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DIRS = [
  path.join(ROOT, 'public'),
  path.join(ROOT, 'public', 'Achievments', 'Badges'),
  path.join(ROOT, 'public', 'Achievments', 'Titles'),
  path.join(ROOT, 'client', 'assets'),
];

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg'];
const QUALITY = 80; // WebP quality — 80 is visually near-lossless

async function convertFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTS.includes(ext)) return null;

  const originalSize = fs.statSync(filePath).size;
  const webpPath = filePath.replace(/\.(png|jpe?g)$/i, '.webp');

  // Skip if webp already exists and is newer
  if (fs.existsSync(webpPath)) {
    const webpStat = fs.statSync(webpPath);
    if (webpStat.mtimeMs > fs.statSync(filePath).mtimeMs) {
      return null; // already converted
    }
  }

  try {
    await sharp(filePath)
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    const newSize = fs.statSync(webpPath).size;
    const saved = ((1 - newSize / originalSize) * 100).toFixed(1);
    const name = path.relative(ROOT, filePath);
    console.log(
      `✅ ${name}: ${(originalSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB (${saved}% smaller)`
    );
    return { original: originalSize, webp: newSize };
  } catch (err) {
    console.error(`❌ Failed: ${filePath} — ${err.message}`);
    return null;
  }
}

async function main() {
  let totalOriginal = 0;
  let totalWebp = 0;
  let count = 0;

  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (!fs.statSync(filePath).isFile()) continue;
      const result = await convertFile(filePath);
      if (result) {
        totalOriginal += result.original;
        totalWebp += result.webp;
        count++;
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Converted: ${count} files`);
  console.log(`Before: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`After:  ${(totalWebp / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Saved:  ${((totalOriginal - totalWebp) / 1024 / 1024).toFixed(2)} MB (${((1 - totalWebp / totalOriginal) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
