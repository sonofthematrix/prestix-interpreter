/**
 * Fix image naming in missfish venue photos directory.
 *
 * - venuw -> venue (typo)
 * - spaces -> underscores (e.g. "table reserve" -> "table_reserve")
 *
 * Run: bun scripts/fix-missfish-image-naming.ts
 */

import { readdir, rename } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(process.cwd());
const PHOTOS_DIR = join(ROOT, "public", "images", "partners", "missfish", "venue", "photos");

function sanitizeFilename(name: string): string {
  return name
    .replace(/venuw/gi, "venue")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function main() {
  console.log("Fixing missfish image naming...\n");

  const files = await readdir(PHOTOS_DIR);
  const imageFiles = files.filter(
    (f) =>
      f.endsWith(".jpg") ||
      f.endsWith(".jpeg") ||
      f.endsWith(".png") ||
      f.endsWith(".webp") ||
      f.endsWith(".svg")
  );

  let renamed = 0;
  for (const filename of imageFiles) {
    const fixed = sanitizeFilename(filename);
    if (fixed !== filename) {
      const oldPath = join(PHOTOS_DIR, filename);
      const newPath = join(PHOTOS_DIR, fixed);
      await rename(oldPath, newPath);
      console.log(`  ${filename} → ${fixed}`);
      renamed++;
    }
  }

  console.log(`\nDone. Renamed ${renamed} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
