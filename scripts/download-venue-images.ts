#!/usr/bin/env tsx
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import https from 'https';

// Unsplash API (free tier: 50 requests/hour)
// Get your access key from: https://unsplash.com/developers
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

interface ImageConfig {
  path: string;
  searchTerm: string;
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      require('fs').unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function searchUnsplashImage(query: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('⚠️  UNSPLASH_ACCESS_KEY not set in .env - skipping Unsplash download');
    return null;
  }

  return new Promise((resolve) => {
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`;
    
    https.get(searchUrl, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            // Get regular size image URL
            resolve(json.results[0].urls.regular);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Error parsing Unsplash response:', err);
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

async function downloadPlaceholderImage(filepath: string, width: number, height: number): Promise<void> {
  // Use existing placeholder image from the project
  const sourceImage = join(__dirname, '../public/images/placeholders/horizontalBG.png');
  const fs = require('fs');
  
  if (fs.existsSync(sourceImage)) {
    // Copy the existing placeholder
    fs.copyFileSync(sourceImage, filepath);
  } else {
    // Create a simple colored rectangle as fallback
    console.log(`⚠️  No placeholder available, file will need manual upload: ${filepath}`);
  }
}

async function main() {
  console.log('🖼️  Downloading Venue & Event Images...\n');

  const configPath = join(__dirname, 'venue-image-config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  const publicDir = join(__dirname, '../public');
  const venuesDir = join(publicDir, 'images/venues');
  const eventsDir = join(publicDir, 'images/events');

  // Ensure directories exist
  if (!existsSync(venuesDir)) mkdirSync(venuesDir, { recursive: true });
  if (!existsSync(eventsDir)) mkdirSync(eventsDir, { recursive: true });

  const imagesToDownload: ImageConfig[] = [];

  // Collect all venue images
  for (const [venueName, venueConfig] of Object.entries(config.venues)) {
    const vc = venueConfig as any;
    const searchTerm = vc.stockPhotoSuggestions?.unsplash || venueName;
    
    // Logo
    imagesToDownload.push({ path: join(publicDir, vc.logo), searchTerm: `${searchTerm} logo` });
    // Cover
    imagesToDownload.push({ path: join(publicDir, vc.coverImage), searchTerm });
    // Gallery
    if (vc.gallery) {
      vc.gallery.forEach((galleryPath: string, idx: number) => {
        imagesToDownload.push({ 
          path: join(publicDir, galleryPath), 
          searchTerm: `${searchTerm} interior ${idx + 1}` 
        });
      });
    }
  }

  // Collect all event images
  for (const [eventName, eventConfig] of Object.entries(config.events)) {
    const ec = eventConfig as any;
    const searchTerm = ec.stockPhotoSuggestions?.unsplash || eventName;
    
    if (ec.images) {
      ec.images.forEach((imagePath: string) => {
        imagesToDownload.push({ path: join(publicDir, imagePath), searchTerm });
      });
    }
  }

  console.log(`📋 Found ${imagesToDownload.length} images to download\n`);

  let downloadedCount = 0;
  let skippedCount = 0;

  for (const { path, searchTerm } of imagesToDownload) {
    const filename = path.split('/').pop();
    
    // Skip if file already exists
    if (existsSync(path)) {
      console.log(`⏭️  Skipped (exists): ${filename}`);
      skippedCount++;
      continue;
    }

    try {
      if (UNSPLASH_ACCESS_KEY) {
        console.log(`🔍 Searching Unsplash: "${searchTerm}"...`);
        const imageUrl = await searchUnsplashImage(searchTerm);
        
        if (imageUrl) {
          console.log(`⬇️  Downloading: ${filename}...`);
          await downloadImage(imageUrl, path);
          downloadedCount++;
          console.log(`✅ Downloaded: ${filename}\n`);
          
          // Rate limiting: wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`⚠️  No Unsplash results for "${searchTerm}", using placeholder...`);
          await downloadPlaceholderImage(path, 1200, 800);
          downloadedCount++;
          console.log(`✅ Created placeholder: ${filename}\n`);
        }
      } else {
        console.log(`📦 Creating placeholder: ${filename}...`);
        await downloadPlaceholderImage(path, 1200, 800);
        downloadedCount++;
        console.log(`✅ Created: ${filename}\n`);
      }
    } catch (error) {
      console.error(`❌ Error downloading ${filename}:`, error);
    }
  }

  console.log('\n✨ Image download complete!');
  console.log(`📊 Summary: ${downloadedCount} downloaded, ${skippedCount} skipped (already exist)`);
  
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('\n💡 Tip: Add UNSPLASH_ACCESS_KEY to your .env file for real images');
    console.log('   Get your free key at: https://unsplash.com/developers');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
