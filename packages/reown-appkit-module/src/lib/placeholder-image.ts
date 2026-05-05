/**
 * Placeholder Image Utility
 * Generates inline SVG data URIs for placeholders to eliminate server requests
 */

/**
 * Generate a placeholder image as a data URI (SVG)
 * This eliminates server requests for placeholder images
 */
export function getPlaceholderImage(options?: {
  width?: number;
  height?: number;
  text?: string;
  bgColor?: string;
  textColor?: string;
}): string {
  const {
    width = 400,
    height = 300,
    text = 'No Image',
    bgColor = '#f3f4f6',
    textColor = '#9ca3af',
  } = options || {};

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="14" 
        font-weight="500"
        fill="${textColor}"
        text-anchor="middle" 
        dominant-baseline="middle"
      >${text}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Get placeholder for admin tables (small thumbnails)
 */
export function getAdminTablePlaceholder(): string {
  return getPlaceholderImage({
    width: 64,
    height: 40,
    text: 'No Image',
    bgColor: '#f3f4f6',
    textColor: '#9ca3af',
  });
}

/**
 * Get placeholder for dialog/preview (medium size)
 */
export function getDialogPlaceholder(): string {
  return getPlaceholderImage({
    width: 400,
    height: 300,
    text: 'No Image',
    bgColor: '#f3f4f6',
    textColor: '#9ca3af',
  });
}

/**
 * Dark mode compatible placeholder
 */
export function getPlaceholderImageDark(options?: {
  width?: number;
  height?: number;
  text?: string;
}): string {
  return getPlaceholderImage({
    ...options,
    bgColor: '#1f2937',
    textColor: '#6b7280',
  });
}

/**
 * Check if an image URL is a placeholder
 */
export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  return url === '/placeholder-image.png' || url.startsWith('data:image/svg+xml');
}

