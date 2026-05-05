/**
 * Documentation Image Matcher & Placeholder Generator
 * 
 * Matches documentation to available cover images from public directories
 * Generates placeholder SVG covers with title, category, and logos when no match is found
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

// Available image directories to search
const IMAGE_DIRECTORIES = [
  'public/images/docs',
  'public/images/blog',
  'public/blog',
  'public',
] as const;

// Supported image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp'] as const;

// Category-based logo mappings
const CATEGORY_LOGOS: Record<string, string[]> = {
  'implementation': ['⚙️', '🔧', '💻'],
  'architecture': ['🏗️', '📐', '🏛️'],
  'development': ['💻', '🔨', '⚡'],
  'features': ['✨', '🎯', '🚀'],
  'guides': ['📖', '📘', '📚'],
  'reference': ['📋', '📝', '📄'],
  'setup': ['⚙️', '🔧', '⚡'],
  'quick-start': ['🚀', '⚡', '🎯'],
  'best-practices': ['✅', '💡', '⭐'],
  'qtech': ['🎮', '🎲', '🎰'],
  'blockchain': ['⛓️', '🔗', '₿'],
  'gaming': ['🎮', '🎲', '🎯'],
  'marketplace': ['🏪', '🛒', '💼'],
  'investment': ['💰', '📈', '💎'],
  'consolidated': ['📚', '📦', '📑'],
  'general': ['📄', '📋', '📝'],
} as const;

/**
 * Semantic mapping of documentation topics to blog cover images
 * Maps documentation categories, keywords, and topics to appropriate blog covers
 */
const DOCUMENTATION_TO_BLOG_COVER_MAPPING: Record<string, string[]> = {
  // Architecture & System Design
  'architecture': ['modern-sql-serverless', 'microservice', 'fullstack-zenstack', 'modern-sql-programming'],
  'system-design': ['microservice', 'modern-sql-serverless', 'architecture'],
  'dependency': ['architecture', 'modern-sql-serverless'],
  'dependency-analysis': ['architecture', 'modern-sql-serverless'],
  'dependency-diagram': ['architecture', 'modern-sql-serverless'],
  
  // Development & Developer Experience
  'development': ['good-dx', 'code-as-doc', 'github-copilot', 'fullstack-zenstack'],
  'developer-experience': ['good-dx', 'code-as-doc', 'modern-sql-dx'],
  'workflow': ['good-dx', 'code-as-doc', 'modern-sql-dx'],
  'coding': ['code-as-doc', 'github-copilot', 'good-dx'],
  
  // Features & Functionality
  'features': ['polymorphism', 'form-validation', 'typesafe-query', 'check-function'],
  'feature': ['polymorphism', 'form-validation', 'typesafe-query'],
  'functionality': ['typesafe-query', 'check-function'],
  
  // Guides & Tutorials
  'guides': ['how-to-authz', 'how-to-authz-2', 'start-with-why', 'fullstack-zenstack'],
  'guide': ['how-to-authz', 'start-with-why'],
  'tutorial': ['how-to-authz', 'fullstack-zenstack'],
  'integration': ['fullstack-zenstack', 'how-to-authz', 'connect-dots'],
  'integration-guide': ['fullstack-zenstack', 'connect-dots'],
  
  // Setup & Configuration
  'setup': ['adapt-to-edge', 'next-chapter-1', 'next-rsc-blog', 'modern-sql-serverless'],
  'configuration': ['adapt-to-edge', 'modern-sql-serverless'],
  'install': ['next-chapter-1', 'adapt-to-edge'],
  'installation': ['next-chapter-1', 'adapt-to-edge'],
  
  // Quick Start
  'quick-start': ['next-chapter-1', 'start-with-why', 'fullstack-zenstack'],
  'quickstart': ['next-chapter-1', 'start-with-why'],
  'getting-started': ['next-chapter-1', 'start-with-why'],
  
  // Best Practices
  'best-practices': ['technical-debt', 'trade-off', 'code-legacy', 'good-dx'],
  'best-practice': ['technical-debt', 'trade-off'],
  'practices': ['technical-debt', 'trade-off', 'code-legacy'],
  
  // QTech & Gaming
  'qtech': ['gaming', 'modern-sql-ai', 'ai-agent'],
  'gaming': ['gaming', 'modern-sql-ai'],
  'casino': ['gaming', 'modern-sql-ai'],
  'game': ['gaming', 'modern-sql-ai'],
  
  // Blockchain
  'blockchain': ['modern-sql-serverless', 'secure-api', 'database-to-the-public'],
  'blockchain-integration': ['modern-sql-serverless', 'secure-api'],
  'smart-contract': ['secure-api', 'modern-sql-serverless'],
  'contract': ['secure-api', 'modern-sql-serverless'],
  
  // Authentication & Authorization
  'auth': ['better-auth', 'clerk-multitenancy', 'stackauth-multitenancy', 'redwood-auth', 'prisma-auth'],
  'authentication': ['better-auth', 'prisma-auth', 'redwood-auth'],
  'authorization': ['how-to-authz', 'how-to-authz-2', 'model-authz', 'llm-acl'],
  'authz': ['how-to-authz', 'how-to-authz-2', 'model-authz'],
  'acl': ['llm-acl', 'model-authz', 'how-to-authz'],
  'access-control': ['how-to-authz', 'how-to-authz-2', 'model-authz'],
  'security': ['secure-api', 'better-auth', 'how-to-authz'],
  
  // API & Backend
  'api': ['rest-api-on-vercel', 'nest-api', 'openapi', 'no-api', 'saas-backend'],
  'backend': ['saas-backend', 'rest-api-on-vercel', 'nest-api'],
  'endpoint': ['rest-api-on-vercel', 'openapi'],
  'rest': ['rest-api-on-vercel', 'openapi'],
  'graphql': ['openapi', 'rest-api-on-vercel'],
  
  // Database & ORM
  'database': ['modern-sql-programming', 'modern-sql-serverless', 'drizzle-prisma', 'prisma-tanstack'],
  'orm': ['drizzle-prisma', 'prisma-tanstack', 'modern-sql-programming'],
  'prisma': ['prisma-tanstack', 'prisma-client-extensions', 'drizzle-prisma'],
  'sql': ['modern-sql-programming', 'modern-sql-serverless', 'modern-sql-dx'],
  'schema': ['modern-sql-programming', 'code-as-doc'],
  'migration': ['modern-sql-programming', 'prisma-tanstack'],
  
  // Multi-tenancy
  'multi-tenant': ['multi-tenant', 'clerk-multitenancy', 'stackauth-multitenancy'],
  'multitenancy': ['multi-tenant', 'clerk-multitenancy'],
  'tenant': ['multi-tenant', 'clerk-multitenancy'],
  
  // Testing
  'testing': ['good-dx', 'code-as-doc', 'check-function'],
  'test': ['check-function', 'good-dx'],
  'spec': ['check-function', 'good-dx'],
  
  // AI & Machine Learning
  'ai': ['ai-agent', 'ai-programmer', 'modern-sql-ai', 'llm-acl', 'github-copilot'],
  'artificial-intelligence': ['ai-agent', 'ai-programmer', 'modern-sql-ai'],
  'machine-learning': ['ai-agent', 'ai-programmer'],
  'llm': ['llm-acl', 'ai-agent', 'modern-sql-ai'],
  
  // Frontend
  'frontend': ['frontend-complexity', 'react-admin', 'react-table', 'js-fullstack'],
  'react': ['react-admin', 'react-table', 'js-fullstack'],
  'ui': ['frontend-complexity', 'react-admin', 'react-table'],
  'component': ['react-admin', 'react-table'],
  
  // TypeScript & Type Safety
  'typescript': ['typesafe-query', 'json-typing', 'good-dx'],
  'type': ['typesafe-query', 'json-typing'],
  'typesafe': ['typesafe-query', 'json-typing'],
  'typing': ['json-typing', 'typesafe-query'],
  
  // Documentation
  'documentation': ['code-as-doc', 'database-to-the-public', 'database-to-mcp'],
  'docs': ['code-as-doc', 'database-to-the-public'],
  'doc': ['code-as-doc', 'database-to-the-public'],
  
  // Reference & Technical
  'reference': ['openapi', 'database-to-the-public', 'code-as-doc'],
  'technical': ['technical-debt', 'trade-off', 'code-legacy'],
  'specification': ['openapi', 'database-to-the-public'],
  
  // User Documentation
  'user-docs': ['start-with-why', 'good-dx', 'fullstack-zenstack'],
  'user-guide': ['start-with-why', 'good-dx'],
  'manual': ['start-with-why', 'good-dx'],
  
  // Alternatives & Comparisons
  'alternative': ['firebase-alternative', 'supabase-alternative', 'postgrest-alternative'],
  'comparison': ['trade-off', 'drizzle-prisma'],
  'vs': ['trade-off', 'drizzle-prisma'],
  
  // OSS & Community
  'oss': ['seven-months-oss', 'contribute-oss'],
  'open-source': ['seven-months-oss', 'contribute-oss'],
  'community': ['contribute-oss', 'seven-months-oss'],
  
  // General Development Concepts
  'business-logic': ['business-logic-db'],
  'logic': ['business-logic-db', 'check-function'],
  'validation': ['form-validation', 'check-function'],
  'form': ['form-validation'],
  'soft-delete': ['soft-delete-real'],
  'delete': ['soft-delete-real'],
  'polymorphism': ['polymorphism'],
  'ocp': ['ocp'],
  'refine': ['refine-dev-backend'],
  'find': ['find-user'],
  'user': ['find-user', 'better-auth'],
} as const;

/**
 * Find available cover images in directories
 */
function findAvailableImages(): Map<string, string> {
  const imageMap = new Map<string, string>();
  const projectRoot = process.cwd();

  for (const dir of IMAGE_DIRECTORIES) {
    const fullPath = join(projectRoot, dir);
    if (!existsSync(fullPath)) continue;

    try {
      const scanDirectory = (currentPath: string, relativePath: string = '') => {
        const entries = readdirSync(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const entryPath = join(currentPath, entry.name);
          const relativeEntryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          
          if (entry.isDirectory()) {
            scanDirectory(entryPath, relativeEntryPath);
          } else if (entry.isFile()) {
            const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
            if (IMAGE_EXTENSIONS.includes(ext as any)) {
              const nameWithoutExt = entry.name.replace(/\.[^/.]+$/, '').toLowerCase();
              const publicPath = `/${dir.replace('public/', '')}/${relativeEntryPath}`;
              
              // Store by filename (without extension)
              if (!imageMap.has(nameWithoutExt)) {
                imageMap.set(nameWithoutExt, publicPath);
              }
              
              // Store by full path segments (e.g., "blog/multi-tenant/cover" -> path)
              const pathSegments = relativeEntryPath.split('/').map(s => s.replace(/\.[^/.]+$/, '').toLowerCase());
              
              // Store individual segments
              pathSegments.forEach(segment => {
                if (segment && segment.length > 2 && !imageMap.has(segment)) {
                  imageMap.set(segment, publicPath);
                }
              });
              
              // Store combined path segments (e.g., "multi-tenant", "multi-tenant-cover")
              if (pathSegments.length > 1) {
                // Store parent directory name (e.g., "multi-tenant" from "blog/multi-tenant/cover.png")
                const parentDir = pathSegments[pathSegments.length - 2];
                if (parentDir && parentDir.length > 2 && !imageMap.has(parentDir)) {
                  imageMap.set(parentDir, publicPath);
                }
                
                // Store parent + filename (e.g., "multi-tenant-cover")
                const combinedKey = `${parentDir}-${nameWithoutExt}`;
                if (!imageMap.has(combinedKey)) {
                  imageMap.set(combinedKey, publicPath);
                }
              }
              
              // For blog covers specifically, store by blog slug (directory name)
              if (relativeEntryPath.includes('blog/') && pathSegments.length >= 2) {
                const blogSlugIndex = pathSegments.findIndex(s => s === 'blog');
                if (blogSlugIndex >= 0 && blogSlugIndex < pathSegments.length - 1) {
                  const blogSlug = pathSegments[blogSlugIndex + 1];
                  if (blogSlug && blogSlug.length > 2 && !imageMap.has(blogSlug)) {
                    imageMap.set(blogSlug, publicPath);
                  }
                }
              }
            }
          }
        }
      };

      scanDirectory(fullPath);
    } catch (error) {
      console.warn(`Failed to scan ${dir}:`, error);
    }
  }

  return imageMap;
}

// Cache the image map
let cachedImageMap: Map<string, string> | null = null;

/**
 * Get cached or fresh image map
 */
function getImageMap(): Map<string, string> {
  if (!cachedImageMap) {
    cachedImageMap = findAvailableImages();
  }
  return cachedImageMap;
}

/**
 * Match documentation to available cover image
 * Tries multiple matching strategies:
 * 1. Semantic mapping (keywords -> blog covers)
 * 2. Exact slug match
 * 3. Slug segments match
 * 4. Category match
 * 5. Title keyword match
 * 6. Tag match
 * 7. Partial matches
 */
export function matchDocumentationCover(
  slug: string,
  category?: string,
  title?: string,
  tags?: string[]
): string | null {
  const imageMap = getImageMap();
  const lowerSlug = slug.toLowerCase();
  const lowerTitle = title?.toLowerCase() || '';
  const lowerCategory = category?.toLowerCase() || '';
  
  // Strategy 0: Semantic mapping (check keywords in slug, category, title, tags)
  const allKeywords = [
    ...lowerSlug.split(/[-_/]/).filter(s => s.length > 2),
    ...(lowerCategory ? lowerCategory.split(/[-_/]/).filter(s => s.length > 2) : []),
    ...(lowerTitle ? lowerTitle.split(/\s+/).filter(w => w.length > 3) : []),
    ...(tags || []).map(t => t.toLowerCase()),
  ];
  
  // Try semantic mapping for each keyword
  for (const keyword of allKeywords) {
    const mappedCovers = DOCUMENTATION_TO_BLOG_COVER_MAPPING[keyword];
    if (mappedCovers) {
      // Try each mapped cover in order of preference
      for (const coverKey of mappedCovers) {
        // Check multiple possible keys for the blog cover
        const possibleKeys = [
          coverKey, // Direct key (e.g., "multi-tenant")
          `${coverKey}/cover`, // With cover suffix (e.g., "multi-tenant/cover")
          `images/blog/${coverKey}/cover`, // Full path (e.g., "images/blog/multi-tenant/cover")
        ];
        
        for (const key of possibleKeys) {
          const coverPath = imageMap.get(key);
          if (coverPath) {
            return coverPath;
          }
        }
        
        // Also try constructing the path directly if it's a blog cover
        const directBlogPath = `/images/blog/${coverKey}/cover.png`;
        if (imageMap.has(coverKey) || imageMap.has(`${coverKey}/cover`)) {
          // Path already exists in map, will be found above
          continue;
        }
      }
    }
  }

  // Strategy 1: Exact slug match
  if (imageMap.has(lowerSlug)) {
    return imageMap.get(lowerSlug)!;
  }

  // Strategy 2: Slug segments match
  const slugSegments = lowerSlug.split(/[-_/]/).filter(s => s.length > 2);
  for (const segment of slugSegments) {
    if (imageMap.has(segment)) {
      return imageMap.get(segment)!;
    }
  }

  // Strategy 3: Category match
  if (lowerCategory) {
    const categorySegments = lowerCategory.split(/[-_/]/).filter(s => s.length > 2);
    for (const segment of categorySegments) {
      if (imageMap.has(segment)) {
        return imageMap.get(segment)!;
      }
    }
  }

  // Strategy 4: Title keywords match
  if (lowerTitle) {
    const titleWords = lowerTitle.split(/\s+/).filter(w => w.length > 3);
    for (const word of titleWords) {
      if (imageMap.has(word)) {
        return imageMap.get(word)!;
      }
    }
  }

  // Strategy 5: Tag match
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      if (imageMap.has(lowerTag)) {
        return imageMap.get(lowerTag)!;
      }
    }
  }

  // Strategy 6: Partial matches
  for (const [key, path] of imageMap.entries()) {
    if (lowerSlug.includes(key) || key.includes(lowerSlug)) {
      return path;
    }
    if (lowerTitle && (lowerTitle.includes(key) || key.includes(lowerTitle))) {
      return path;
    }
  }

  return null;
}

/**
 * Generate placeholder SVG cover with title, category, and logos
 * Text wraps properly instead of truncating
 * Uses dark muted colors matching the card background
 */
export function generatePlaceholderCover(
  title: string,
  category?: string,
  tags?: string[]
): string {
  // Get category logos
  const categoryKey = category?.toLowerCase().split('/').pop() || 'general';
  const logos = CATEGORY_LOGOS[categoryKey] || CATEGORY_LOGOS['general'] || ['📄'];
  
  // Generate SVG with Tokenizin branding
  // Split title into words for wrapping
  const words = escapeXml(title).split(' ');
  const safeCategory = category ? escapeXml(category.toUpperCase()) : '';
  
  // Calculate text wrapping - break title into lines that fit within 700px width
  const maxWidth = 700;
  const fontSize = 48;
  const lineHeight = 60;
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Rough estimate: each character is ~fontSize * 0.6 wide
    const estimatedWidth = testLine.length * fontSize * 0.6;
    
    if (estimatedWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Limit to 3 lines to prevent overflow
  const displayLines = lines.slice(0, 3);
  const startY = 180 - (displayLines.length - 1) * lineHeight / 2;
  
  // Generate SVG with TigerBG.png background and text overlay
  const svg = `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <!-- Dark overlay gradient for text readability -->
    <linearGradient id="overlay-${categoryKey}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0.4);stop-opacity:1" />
      <stop offset="50%" style="stop-color:rgba(0,0,0,0.6);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.7);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Tiger Background Image -->
  <image href="/TigerBG.png" x="0" y="0" width="800" height="400" preserveAspectRatio="xMidYMid slice" opacity="0.9"/>
  
  <!-- Dark overlay for text readability -->
  <rect width="800" height="400" fill="url(#overlay-${categoryKey})"/>
  
  <!-- Title - wrapped text with strong shadow for visibility -->
  <text x="400" y="${startY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="white" style="text-shadow: 0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6);">
    ${displayLines.map((line, index) => {
      const y = startY + (index * lineHeight);
      return `<tspan x="400" dy="${index === 0 ? '0' : lineHeight}" text-anchor="middle">${line}</tspan>`;
    }).join('')}
  </text>
  
  <!-- Category -->
  ${safeCategory ? `
  <text x="400" y="${startY + (displayLines.length * lineHeight) + 20}" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="rgba(255,255,255,0.95)" style="text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 6px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6);">
    ${safeCategory}
  </text>
  ` : ''}
  
  <!-- Logos at bottom center -->
  <g transform="translate(400, 320)">
    ${logos.map((logo, index) => {
      const x = (index - (logos.length - 1) / 2) * 60;
      return `<text x="${x}" y="0" font-size="32" text-anchor="middle" fill="rgba(255,255,255,0.9)" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));">${logo}</text>`;
    }).join('')}
  </g>
  
  <!-- Decorative dots -->
  <circle cx="400" cy="280" r="4" fill="white" opacity="0.7"/>
  <circle cx="420" cy="280" r="4" fill="white" opacity="0.5"/>
  <circle cx="440" cy="280" r="4" fill="white" opacity="0.3"/>
</svg>`.trim();

  // Convert to data URL for use in img src
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get documentation cover image URL
 * Returns matched image or generated placeholder
 */
export function getDocumentationCoverImage(
  slug: string,
  category?: string,
  title?: string,
  tags?: string[]
): string {
  // Try to match existing image
  const matched = matchDocumentationCover(slug, category, title, tags);
  if (matched) {
    return matched;
  }

  // Generate placeholder
  return generatePlaceholderCover(title || slug, category, tags);
}

