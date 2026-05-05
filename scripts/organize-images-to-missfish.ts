/**
 * Organize images into missfish directory structure.
 *
 * - Moves public/images/venues/*.jpg → public/images/partners/missfish/venue/photos/
 * - Renames to missfish_venue_photo_N.jpg for consistency
 *
 * Run: bun scripts/organize-images-to-missfish.ts
 */

import { readdir, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(process.cwd());
const VENUES_SRC = join(ROOT, "public", "images", "venues");
const MISSFISH_VENUE_PHOTOS = join(ROOT, "public", "images", "partners", "missfish", "venue", "photos");

async function main() {
  console.log("Organizing images to missfish directory...\n");

  try {
    const files = await readdir(VENUES_SRC);
    const jpgFiles = files.filter((f) => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".jpeg"));

    if (jpgFiles.length === 0) {
      console.log("No .jpg files found in public/images/venues");
      return;
    }

    await mkdir(MISSFISH_VENUE_PHOTOS, { recursive: true });
    console.log(`Created: ${MISSFISH_VENUE_PHOTOS}\n`);

    for (let i = 0; i < jpgFiles.length; i++) {
      const oldPath = join(VENUES_SRC, jpgFiles[i]);
      const ext = jpgFiles[i].includes(".jpeg") ? ".jpeg" : ".jpg";
      const newName = `missfish_venue_photo_${String(i + 1).padStart(2, "0")}${ext}`;
      const newPath = join(MISSFISH_VENUE_PHOTOS, newName);

      await rename(oldPath, newPath);
      console.log(`  ${jpgFiles[i]} → partners/missfish/venue/photos/${newName}`);
    }

    console.log(`\nDone. Moved ${jpgFiles.length} images to missfish/venue/photos/`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
