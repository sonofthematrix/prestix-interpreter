/**
 * Upload missfish venue photos to Vercel Blob and record URLs in PlatformMediaAsset.
 *
 * - Reads images from public/images/partners/missfish/venue/photos
 * - Fixes naming: venuw -> venue, spaces -> underscores
 * - Uploads each to Vercel Blob (platform/missfish/...)
 * - Creates PlatformMediaAsset records for admin/venue host selection
 *
 * Requires: BLOB_READ_WRITE_TOKEN in .env
 * Run: bun scripts/upload-missfish-images-to-blob.ts
 */

import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { createClient } from "../src/lib/db";

const ROOT = join(process.cwd());
const PHOTOS_DIR = join(ROOT, "public", "images", "partners", "missfish", "venue", "photos");

const systemUser = {
  id: "system",
  email: "system@TKNZN.pro",
  role: "PLATFORM_ADMIN" as const,
  name: "System Admin",
};

/** Sanitize filename: fix typos, replace spaces with underscores */
function sanitizeName(filename: string): string {
  return filename
    .replace(/venuw/gi, "venue")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Derive category from filename for easier filtering */
function deriveCategory(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("background") || lower.includes("wall")) return "background";
  if (lower.includes("event") || lower.includes("sundaze") || lower.includes("media_events")) return "event";
  if (lower.includes("food") || lower.includes("table_food")) return "food";
  if (lower.includes("girls")) return "lifestyle";
  if (lower.includes("table") || lower.includes("lounge") || lower.includes("bar") || lower.includes("reserve") || lower.includes("premium")) return "table";
  if (lower.includes("media_missfish")) return "venue";
  return "venue";
}

async function main() {
  console.log("Uploading missfish venue photos to Vercel Blob...\n");

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("Missing BLOB_READ_WRITE_TOKEN in .env. Add it from Vercel Dashboard → Storage.");
    process.exit(1);
  }

  const db = createClient(systemUser as any);

  // Check for existing assets to avoid duplicates (optional: use --force to re-upload)
  const existing = await db.platformMediaAsset.findMany({ select: { source: true } });
  const existingSources = new Set(existing.map((e) => e.source));

  const files = await readdir(PHOTOS_DIR);
  const imageFiles = files.filter(
    (f) =>
      f.endsWith(".jpg") ||
      f.endsWith(".jpeg") ||
      f.endsWith(".png") ||
      f.endsWith(".webp") ||
      f.endsWith(".svg")
  );

  if (imageFiles.length === 0) {
    console.log("No image files found in", PHOTOS_DIR);
    return;
  }

  console.log(`Found ${imageFiles.length} images. Uploading...\n`);

  let uploaded = 0;
  let skipped = 0;

  for (const filename of imageFiles) {
    const sourcePath = `partners/missfish/venue/photos/${filename}`;
    if (existingSources.has(sourcePath)) {
      console.log(`  [skip] ${filename} (already in DB)`);
      skipped++;
      continue;
    }

    const filePath = join(PHOTOS_DIR, filename);
    const buffer = await readFile(filePath);
    const sanitizedName = sanitizeName(filename.replace(/\.[^.]+$/, "")) + filename.slice(filename.lastIndexOf("."));
    const blobPath = `platform/missfish/${Date.now()}-${sanitizedName}`;

    try {
      const blob = await put(blobPath, buffer, {
        access: "private",
        addRandomSuffix: false,
      });

      const isPrivate = blob.url?.includes(".private.blob.vercel-storage.com");
      const displayUrl = isPrivate
        ? `/api/blob?pathname=${encodeURIComponent(blob.pathname)}`
        : blob.url ?? "";

      await db.platformMediaAsset.create({
        data: {
          name: sanitizeName(filename),
          url: displayUrl,
          pathname: blob.pathname,
          category: deriveCategory(filename),
          source: sourcePath,
        },
      });

      console.log(`  [ok] ${filename} → ${blob.pathname}`);
      uploaded++;
    } catch (err) {
      console.error(`  [fail] ${filename}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
