/**
 * Marketplace Generator Integration
 * Extends the auto-generation system with marketplace-specific patterns
 */

// ARCHIVED: Template imports disabled - file is archived and templates may not exist
// import { 
//   MarketplaceTemplateConfig,
//   generateMarketplaceCardTemplate,
//   generateMediaCarouselTemplate,
//   generateDynamicGridTemplate,
//   generateMarketplacePageTemplate
// } from './templates/marketplace-templates';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface MarketplaceModelConfig {
  name: string;
  isMarketplaceEntity: boolean;
  hasVideo: boolean;
  hasCarousel: boolean;
  imageFields: string[];
  videoField?: string;
  primaryImageField?: string;
}

/**
 * Detect if a model is a marketplace entity
 */
export function isMarketplaceEntity(modelName: string): boolean {
  const marketplaceModels = [
    'RealEstateAsset',
    'Property',
    'Asset',
    'Product',
    'Listing',
    'MarketplaceItem'
  ];
  
  return marketplaceModels.some(m => 
    modelName.toLowerCase().includes(m.toLowerCase())
  );
}

/**
 * Detect if a model should have video support
 */
export function shouldHaveVideo(modelName: string, fields: string[]): boolean {
  // Check if model is marketplace-related
  if (!isMarketplaceEntity(modelName)) return false;
  
  // Check if it has image fields
  const hasImages = fields.some(f => 
    f.toLowerCase().includes('image') || 
    f.toLowerCase().includes('photo') ||
    f.toLowerCase().includes('picture')
  );
  
  return hasImages;
}

/**
 * Extract image fields from model
 */
export function getImageFields(fields: Array<{ name: string; type: string }>): string[] {
  return fields
    .filter(f => 
      f.name.toLowerCase().includes('image') || 
      f.name.toLowerCase().includes('photo') ||
      f.name.toLowerCase().includes('picture') ||
      f.name === 'thumbnail'
    )
    .map(f => f.name);
}

/**
 * Generate marketplace-enhanced components for a model
 */
export function generateMarketplaceComponents(config: MarketplaceModelConfig): {
  card?: string;
  carousel?: string;
  dynamicGrid?: string;
  marketplacePage?: string;
  cardPath: string;
  carouselPath: string;
  dynamicGridPath: string;
  marketplacePagePath: string;
} {
  const { name, hasVideo, hasCarousel, imageFields } = config;
  const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
  
  // ARCHIVED: Template generation functions disabled - file is archived
  // const templateConfig: MarketplaceTemplateConfig = {
  //   modelName: name,
  //   hasVideo,
  //   videoMapping: 'auto',
  //   carouselType: hasCarousel ? 'auto-play' : 'hover',
  //   imageFields,
  // };
  
  // Generate card component with hover video
  const cardComponent = '// ARCHIVED: Template generation disabled';
  // const cardComponent = generateMarketplaceCardTemplate(templateConfig);
  
  // Generate media carousel for detail pages
  const carouselComponent = hasCarousel 
    ? '// ARCHIVED: Template generation disabled'
    : undefined;
  // const carouselComponent = hasCarousel 
  //   ? generateMediaCarouselTemplate(templateConfig)
  //   : undefined;
  
  // Generate dynamic grid component for intelligent layout
  const dynamicGridComponent = '// ARCHIVED: Template generation disabled';
  // const dynamicGridComponent = generateDynamicGridTemplate(templateConfig);
  
  // Generate marketplace page with dynamic grid integration
  const marketplacePageComponent = '// ARCHIVED: Template generation disabled';
  // const marketplacePageComponent = generateMarketplacePageTemplate(templateConfig);
  
  return {
    card: cardComponent,
    carousel: carouselComponent,
    dynamicGrid: dynamicGridComponent,
    marketplacePage: marketplacePageComponent,
    cardPath: `src/components/marketplace/${name}Card.tsx`,
    carouselPath: `src/components/marketplace/${name}MediaCarousel.tsx`,
    dynamicGridPath: `src/components/marketplace/Dynamic${name}Grid.tsx`,
    marketplacePagePath: `src/app/marketplace/page.tsx`,
  };
}

/**
 * Write generated marketplace components to files
 */
export function writeMarketplaceComponents(
  components: ReturnType<typeof generateMarketplaceComponents>
): void {
  const { card, carousel, dynamicGrid, marketplacePage, cardPath, carouselPath, dynamicGridPath, marketplacePagePath } = components;
  
  // Ensure directories exist
  const componentDir = 'src/components/marketplace';
  const pageDir = 'src/app/marketplace';
  
  if (!existsSync(componentDir)) {
    mkdirSync(componentDir, { recursive: true });
  }
  if (!existsSync(pageDir)) {
    mkdirSync(pageDir, { recursive: true });
  }
  
  // Write card component
  if (card) {
    writeFileSync(cardPath, card, 'utf-8');
    console.log(`✅ Generated marketplace card: ${cardPath}`);
  }
  
  // Write carousel component
  if (carousel) {
    writeFileSync(carouselPath, carousel, 'utf-8');
    console.log(`✅ Generated marketplace carousel: ${carouselPath}`);
  }
  
  // Write dynamic grid component
  if (dynamicGrid) {
    writeFileSync(dynamicGridPath, dynamicGrid, 'utf-8');
    console.log(`✅ Generated dynamic grid: ${dynamicGridPath}`);
  }
  
  // Write marketplace page
  if (marketplacePage) {
    writeFileSync(marketplacePagePath, marketplacePage, 'utf-8');
    console.log(`✅ Generated marketplace page: ${marketplacePagePath}`);
  }
}

/**
 * Integration point for CompleteEntityGenerator
 * Call this after standard component generation for marketplace entities
 */
export function enhanceMarketplaceEntity(
  modelName: string,
  fields: Array<{ name: string; type: string }>
): void {
  if (!isMarketplaceEntity(modelName)) {
    return; // Not a marketplace entity, skip enhancement
  }
  
  console.log(`🎬 Enhancing ${modelName} with marketplace features...`);
  
  const imageFields = getImageFields(fields);
  const hasVideo = shouldHaveVideo(modelName, fields.map(f => f.name));
  
  const config: MarketplaceModelConfig = {
    name: modelName,
    isMarketplaceEntity: true,
    hasVideo,
    hasCarousel: true, // Enable carousel for all marketplace entities
    imageFields,
    primaryImageField: imageFields[0] || 'imageUrl',
  };
  
  const components = generateMarketplaceComponents(config);
  writeMarketplaceComponents(components);
  
  console.log(`✅ ${modelName} marketplace enhancement complete!`);
}

/**
 * Batch generate marketplace components for multiple models
 */
export function batchGenerateMarketplaceComponents(
  models: Array<{ name: string; fields: Array<{ name: string; type: string }> }>
): void {
  console.log('\n🎬 Starting marketplace component generation...\n');
  
  const marketplaceModels = models.filter(m => isMarketplaceEntity(m.name));
  
  if (marketplaceModels.length === 0) {
    console.log('⚠️  No marketplace entities found to enhance');
    return;
  }
  
  console.log(`Found ${marketplaceModels.length} marketplace entities:\n`);
  marketplaceModels.forEach(m => console.log(`  - ${m.name}`));
  console.log('');
  
  for (const model of marketplaceModels) {
    enhanceMarketplaceEntity(model.name, model.fields);
  }
  
  console.log('\n✨ Marketplace component generation complete!\n');
}

/**
 * Generate marketplace integration documentation
 */
export function generateMarketplaceIntegrationDocs(
  outputPath: string = 'MARKETPLACE_AUTO_GENERATION.md'
): void {
  const docs = `# Marketplace Auto-Generation Integration

## Overview

The marketplace auto-generation system extends the standard entity generator with video carousel capabilities for marketplace-related entities.

## Features

### 1. Hover Video Cards
- **Automatic Detection**: Detects marketplace entities (RealEstateAsset, Product, etc.)
- **Video Mapping**: Automatically maps images to video files
- **Hover Behavior**: Videos play on hover, pause on unhover
- **Responsive**: Fully responsive with dark theme support

### 2. Auto-Playing Media Carousel
- **Smart Playback**: Videos play from start to finish
- **Auto-Advance**: Carousel advances after images/videos complete
- **Manual Controls**: Navigation arrows and thumbnail strip
- **Pause on Video**: Carousel pauses during video playback

## Usage

### Automatic Generation

Run the standard entity generator - marketplace enhancements are applied automatically:

\`\`\`bash
pnpm generate:entities
\`\`\`

For specific marketplace models only:

\`\`\`bash
pnpm generate:entities --models RealEstateAsset,Product
\`\`\`

### Manual Integration

Import and use in your code:

\`\`\`typescript
import { enhanceMarketplaceEntity } from './plugins/marketplace-generator-integration';

// Enhance a single model
enhanceMarketplaceEntity('RealEstateAsset', fields);

// Batch enhance multiple models
batchGenerateMarketplaceComponents(models);
\`\`\`

## Generated Components

### Card Component (\`{Model}Card.tsx\`)
- Located in: \`src/components/marketplace/{Model}Card.tsx\`
- Features: Hover video, responsive design, dark theme
- Props:
  - \`{lowerModel}\`: The model data
  - \`propertyIndex?\`: Optional video index override
  - \`onAction?\`: Callback for actions
  - \`className?\`: Custom styling

### Carousel Component (\`{Model}MediaCarousel.tsx\`)
- Located in: \`src/components/marketplace/{Model}MediaCarousel.tsx\`
- Features: Auto-play, video support, thumbnails
- Props:
  - \`{lowerModel}Id\`: Model identifier
  - \`images?\`: Array of image objects
  - \`className?\`: Custom styling

## Video File Structure

Place video files in:
\`\`\`
public/videos/marketplace/
├── prop1.mp4
├── prop2.mp4
├── prop3.mp4
├── prop4.mp4
└── prop5.mp4
\`\`\`

## Customization

### Video Mapping

Override video mapping in generated components:

\`\`\`typescript
function getVideoUrl(asset: any, propertyIndex?: number): string | null {
  // Custom mapping logic here
  return \`/videos/marketplace/custom_\${asset.id}.mp4\`;
}
\`\`\`

### Carousel Timing

Modify auto-advance timing:

\`\`\`typescript
// In carousel component
carouselTimerRef.current = setTimeout(() => {
  goToNext();
}, 5000); // Change from 5000ms (5 seconds)
\`\`\`

## Examples

### Using Generated Card Component

\`\`\`typescript
import { RealEstateAssetCard } from '@/components/marketplace/RealEstateAssetCard';

function MarketplacePage() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {assets.map((asset, index) => (
        <RealEstateAssetCard
          key={asset.id}
          realEstateAsset={asset}
          propertyIndex={index + 1}
          onAction={(action, id) => handleAction(action, id)}
        />
      ))}
    </div>
  );
}
\`\`\`

### Using Generated Carousel Component

\`\`\`typescript
import { RealEstateAssetMediaCarousel } from '@/components/marketplace/RealEstateAssetMediaCarousel';

function PropertyDetailPage({ asset }: { asset: RealEstateAsset }) {
  return (
    <div>
      <RealEstateAssetMediaCarousel
        realEstateAssetId={asset.id}
        images={[
          { id: 'main', url: asset.imageUrl },
          ...asset.images
        ]}
      />
    </div>
  );
}
\`\`\`

## Testing

Test generated components:

\`\`\`bash
# Build and verify
pnpm build

# Start dev server
pnpm dev

# Run tests
pnpm test:marketplace
\`\`\`

## Troubleshooting

### Videos Not Playing

1. Check video file paths in \`public/videos/marketplace/\`
2. Verify video codec (should be H.264)
3. Check browser console for autoplay errors

### Carousel Not Advancing

1. Verify \`isAutoPlaying\` state
2. Check if video is still playing (carousel pauses for videos)
3. Ensure timeout is not being cleared prematurely

### Dark Theme Issues

All generated components include dark theme support by default. If issues persist:
- Check \`dark:\` class prefixes
- Verify theme provider is set up correctly
- Test in both light and dark modes

## Architecture

\`\`\`
plugins/
├── templates/
│   └── marketplace-templates.ts      # Component templates
├── marketplace-generator-integration.ts  # Main integration
└── complete-entity-generator.ts      # Calls integration

Generated Output:
src/components/marketplace/
├── {Model}Card.tsx                   # Card with hover video
└── {Model}MediaCarousel.tsx          # Auto-play carousel
\`\`\`

## Best Practices

1. **Video Files**: Keep videos under 10MB for fast loading
2. **Image Optimization**: Use Next.js Image component for all images
3. **Error Handling**: Always provide fallbacks for missing videos
4. **Accessibility**: Include alt text and ARIA labels
5. **Performance**: Use \`preload="metadata"\` for videos
6. **Responsive**: Test on mobile, tablet, and desktop

## Future Enhancements

- [ ] Support for multiple video sources per asset
- [ ] Automatic video transcoding
- [ ] Progressive video loading
- [ ] Video analytics integration
- [ ] Custom transition effects
- [ ] Video thumbnail generation

## Support

For issues or questions:
1. Check this documentation
2. Review generated component code
3. Check implementation examples in \`src/components/marketplace/\`
4. Refer to original implementations:
   - \`RealEstateAssetCard.tsx\`
   - \`PropertyMediaCarousel.tsx\`
`;

  writeFileSync(outputPath, docs, 'utf-8');
  console.log(`📚 Generated marketplace integration documentation: ${outputPath}`);
}

