/**
 * Client-Side Documentation Image Matcher
 * Lightweight version for browser use
 */

// Import Lucide icon data (using lucide package for SVG path data)
// lucide-react uses lucide under the hood, so we use lucide directly for SVG path extraction
// @ts-ignore - lucide is optional dependency, may use lucide-react instead
import * as LucideIcons from 'lucide';

// Helper function to get icon SVG paths from Lucide icon name
// Returns an array of path strings (icons can have multiple paths)
function getIconSvg(iconName: string): string[] {
  try {
    // Get icon function from lucide package
    const Icon = (LucideIcons as any)[iconName];
    if (!Icon || typeof Icon !== 'function') {
      console.warn(`Icon "${iconName}" not found in lucide package`);
      return [];
    }
    
    // Call icon function to get icon data
    // Lucide icons accept props and return an object with path, width, height, etc.
    const iconData = Icon({});
    if (!iconData) return [];
    
    // Lucide icons have a path property that is an array of path strings
    // Each path string represents a separate path element in the SVG
    if (iconData.path && Array.isArray(iconData.path)) {
      // Return array of path strings
      return iconData.path.filter((p: any) => typeof p === 'string');
    }
    
    // Fallback: if path is a string, wrap it in an array
    if (typeof iconData.path === 'string') {
      return [iconData.path];
    }
    
    return [];
  } catch (error) {
    console.warn(`Error getting SVG path for icon "${iconName}":`, error);
    return [];
  }
}

// Category-based logo mappings using Lucide icon names
const CATEGORY_LOGOS: Record<string, string[]> = {
  'implementation': ['Settings', 'Wrench', 'Code'],
  'architecture': ['Building2', 'Ruler', 'Building'],
  'development': ['Code', 'Wrench', 'Zap'],
  'features': ['Sparkles', 'Target', 'Rocket'],
  'guides': ['BookOpen', 'Book', 'BookMarked'],
  'reference': ['Clipboard', 'FileText', 'File'],
  'setup': ['Settings', 'Wrench', 'Zap'],
  'quick-start': ['Rocket', 'Zap', 'Target'],
  'best-practices': ['CheckCircle2', 'Lightbulb', 'Star'],
  'qtech': ['Gamepad2', 'Dice6', 'Casino'],
  'blockchain': ['Link2', 'Link', 'Bitcoin'],
  'gaming': ['Gamepad2', 'Dice6', 'Target'],
  'marketplace': ['Store', 'ShoppingCart', 'Briefcase'],
  'investment': ['DollarSign', 'TrendingUp', 'Gem'],
  'consolidated': ['Library', 'Package', 'FileStack'],
  'general': ['FileText', 'Clipboard', 'File'],
} as const;

/**
 * Generate placeholder SVG cover with title, category, and logos
 * Text wraps properly instead of truncating
 */
export function generatePlaceholderCover(
  title: string,
  category?: string,
  tags?: string[]
): string {
  // Get category logos
  const categoryKey = category?.toLowerCase().split('/').pop()?.split('-').pop() || 'general';
  const logoIconNames = CATEGORY_LOGOS[categoryKey] || CATEGORY_LOGOS['general'] || ['FileText'];
  
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
  
  const svg = `<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <!-- Dark overlay gradient for text readability -->
    <linearGradient id="overlay-${categoryKey.replace(/[^a-z0-9]/g, '')}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0.4);stop-opacity:1" />
      <stop offset="50%" style="stop-color:rgba(0,0,0,0.6);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.7);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Tiger Background Image -->
  <image href="/TigerBG.png" x="0" y="0" width="800" height="400" preserveAspectRatio="xMidYMid slice" opacity="0.9"/>
  
  <!-- Dark overlay for text readability -->
  <rect width="800" height="400" fill="url(#overlay-${categoryKey.replace(/[^a-z0-9]/g, '')})"/>
  
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
    ${logoIconNames.map((iconName, index) => {
      const x = (index - (logoIconNames.length - 1) / 2) * 60;
      const iconPaths = getIconSvg(iconName);
      if (!iconPaths || iconPaths.length === 0) return '';
      // Render icon as SVG paths with proper styling
      // Icons are 24x24 by default, we scale to 32px and center them
      const iconSize = 24;
      const displaySize = 32;
      const scale = displaySize / iconSize;
      const offset = -iconSize / 2;
      return `<g transform="translate(${x}, 0)" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));">
        <g transform="scale(${scale}) translate(${offset}, ${offset})">
          ${iconPaths.map((path: string) => 
            `<path d="${escapeXml(path)}" fill="rgba(255,255,255,0.9)" stroke="none"/>`
          ).join('')}
        </g>
      </g>`;
    }).join('')}
  </g>
  
  <!-- Decorative dots -->
  <circle cx="400" cy="280" r="4" fill="white" opacity="0.7"/>
  <circle cx="420" cy="280" r="4" fill="white" opacity="0.5"/>
  <circle cx="440" cy="280" r="4" fill="white" opacity="0.3"/>
</svg>`;

  // Convert to data URL for use in img src
  // Use Unicode-safe base64 encoding to handle emojis and special characters
  return `data:image/svg+xml;base64,${base64EncodeUnicode(svg)}`;
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
 * Encode Unicode string to base64 safely
 * Handles characters outside Latin1 range (like emojis)
 */
function base64EncodeUnicode(str: string): string {
  // Convert Unicode string to UTF-8 bytes, then to base64
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}

/**
 * Get documentation cover image URL
 * Uses API endpoint for matching, falls back to placeholder
 */
export async function getDocumentationCoverImage(
  slug: string,
  category?: string,
  title?: string,
  tags?: string[]
): Promise<string> {
  try {
    // Try API endpoint for image matching
    const params = new URLSearchParams({
      slug,
      ...(category && { category }),
      ...(title && { title }),
      ...(tags && tags.length > 0 && { tags: tags.join(',') }),
    });

    const response = await fetch(`/api/documentation/cover-image?${params}`);
    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        return data.url;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch cover image from API:', error);
  }

  // Fallback to placeholder
  return generatePlaceholderCover(title || slug, category, tags);
}

/**
 * Get documentation cover image URL (synchronous version using placeholder)
 * Use this for immediate rendering, API version for better matching
 */
export function getDocumentationCoverImageSync(
  slug: string,
  category?: string,
  title?: string,
  tags?: string[]
): string {
  // For now, return placeholder immediately
  // In production, could use a pre-scanned image list
  return generatePlaceholderCover(title || slug, category, tags);
}

