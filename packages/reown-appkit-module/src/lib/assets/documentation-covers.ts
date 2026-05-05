/**
 * Documentation Cover Images
 * Cover images for documentation thumbnails and landing pages
 * Enhanced with image matcher and placeholder generator
 * Uses client-safe version to avoid fs module issues in browser
 */

import { getDocumentationCoverImageSync } from './documentation-image-matcher-client';

export const DOCUMENTATION_COVERS = {
  // Default covers
  default: '/images/docs/covers/default-docs-cover.png',
  defaultSvg: '/images/docs/covers/default-docs-cover.svg',
  
  // Tokenizin specific covers
  'tokenizin-palace-overview': '/images/docs/covers/tokenizin-palace-overview.png',
  'real-estate-tokenization': '/images/docs/covers/real-estate-tokenization.png',
  'gaming-platform': '/images/docs/covers/gaming-platform.png',
  'portfolio-management': '/images/docs/covers/portfolio-management.png',
  'security-compliance': '/images/docs/covers/security-compliance.png',
  'api-documentation': '/images/docs/covers/api-documentation.png',
  'getting-started': '/images/docs/covers/getting-started.png',
  'investment-guide': '/images/docs/covers/investment-guide.png',
  'account-management': '/images/docs/covers/account-management.png',
  'administrator-guide': '/images/docs/covers/administrator-guide.png',
  
  // Category-based covers
  'architecture': '/images/docs/covers/architecture.png',
  'development': '/images/docs/covers/development.png',
  'features': '/images/docs/covers/features.png',
  'quick-start': '/images/docs/covers/quick-start.png',
  'setup': '/images/docs/covers/setup.png',
  'user-docs': '/images/docs/covers/user-docs.png',
  'best-practices': '/images/docs/covers/best-practices.png',
  
  // Fallback covers using existing images
  'fallback-1': '/cover-01.png',
  'fallback-2': '/cover-realestate.jpeg',
  'fallback-3': '/cover-RWA.jpg',
  'fallback-4': '/cover-blocks.png',
  'fallback-5': '/cover-data.png',
  'fallback-6': '/cover-devs.png',
  'fallback-7': '/cover-eco2.png',
  'fallback-8': '/cover-mcp.png',
  'fallback-9': '/cover-mesh.png',
  'fallback-10': '/cover-stack.png',
} as const;

export type DocumentationCoverKey = keyof typeof DOCUMENTATION_COVERS;

/**
 * Get cover image URL for documentation
 * Enhanced with image matching and placeholder generation
 * Uses client-safe synchronous version (placeholder generation)
 * For better matching, use the API endpoint /api/documentation/cover-image
 */
export function getDocumentationCover(
  slug?: string,
  category?: string,
  title?: string,
  tags?: string[]
): string {
  // Try enhanced matching first (client-safe version)
  if (slug || category || title) {
    const matched = getDocumentationCoverImageSync(
      slug || '',
      category,
      title,
      tags
    );
    // Return matched image or placeholder
    if (matched) {
      return matched;
    }
  }
  
  // Fallback to default cover
  return DOCUMENTATION_COVERS.default;
}

/**
 * Get random fallback cover for variety
 */
export function getRandomFallbackCover(): string {
  const fallbackKeys = Object.keys(DOCUMENTATION_COVERS).filter(key => 
    key.startsWith('fallback-')
  ) as DocumentationCoverKey[];
  
  const randomKey = fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)];
  return DOCUMENTATION_COVERS[randomKey];
}

/**
 * Documentation cover image metadata
 */
export interface DocumentationCoverMetadata {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  category?: string;
}

/**
 * Get cover image metadata
 */
export function getDocumentationCoverMetadata(
  slug?: string,
  category?: string,
  title?: string,
  tags?: string[]
): DocumentationCoverMetadata {
  const url = getDocumentationCover(slug, category, title, tags);
  const alt = title ? `${title} documentation cover` : 'Documentation cover image';
  
  return {
    url,
    alt,
    width: 800,
    height: 400,
    category,
  };
}
