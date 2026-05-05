/**
 * Blog Image Matcher
 * Automatically assigns relevant images to blog posts based on topic/category
 */

export interface BlogImageMapping {
  category: string;
  keywords: string[];
  featuredImage: string;
  contentImages: string[];
  fallbackImages: string[];
}

// Image mappings based on blog categories and topics
export const BLOG_IMAGE_MAPPINGS: BlogImageMapping[] = [
  // AI & Technology
  {
    category: 'ai',
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'agent', 'chatbot', 'gpt', 'llm', 'neural'],
    featuredImage: '/img/ai-friendly.png',
    contentImages: [
      '/img/ai-friendly.png',
      '/img/home/tweet1.png',
      '/img/home/client-hooks.png',
    ],
    fallbackImages: [
      '/blog/zenstack-v3-beta/cover.svg',
      '/img/home/saas.png',
    ]
  },

  // Database & SQL
  {
    category: 'database',
    keywords: ['database', 'sql', 'postgresql', 'prisma', 'orm', 'schema', 'migration', 'postgres', 'mysql'],
    featuredImage: '/img/intro/zmodel-generation-light.png',
    contentImages: [
      '/img/intro/zmodel-generation-light.png',
      '/img/intro/zmodel-generation-dark.png',
      '/img/intro/zenstack-layers-light.png',
      '/img/ssot.svg',
    ],
    fallbackImages: [
      '/img/dev-workflow-dark.png',
      '/img/remix-posts.png',
    ]
  },

  // Performance & Optimization
  {
    category: 'performance',
    keywords: ['performance', 'optimization', 'speed', 'cache', 'scalability', 'benchmark', 'fast'],
    featuredImage: '/blog/performance-optimization/cover.png',
    contentImages: [
      '/blog/performance-optimization/cover.svg',
      '/img/home/supercharged-orm-light.png',
      '/img/home/supercharged-orm-dark.png',
    ],
    fallbackImages: [
      '/img/dev-workflow-dark.png',
    ]
  },

  // Tutorial & Getting Started
  {
    category: 'tutorial',
    keywords: ['tutorial', 'getting started', 'guide', 'beginner', 'learn', 'howto', 'step-by-step', 'introduction'],
    featuredImage: '/blog/tutorial-getting-started/cover.svg',
    contentImages: [
      '/img/tutorial-post-update-denied.png',
      '/img/intro/zenstack-nextjs-light.png',
      '/img/intro/zenstack-nextjs-dark.png',
      '/img/the-complete-guide/zen-coder.png',
    ],
    fallbackImages: [
      '/img/intro/api-handler-light.png',
    ]
  },

  // Advanced & Architecture
  {
    category: 'advanced',
    keywords: ['advanced', 'architecture', 'design', 'pattern', 'best practice', 'enterprise', 'scalable'],
    featuredImage: '/blog/advanced-authorization/cover.svg',
    contentImages: [
      '/blog/advanced-authorization/cover.svg',
      '/img/intro/zenstack-layers-light.png',
      '/img/home/internal-tools.png',
    ],
    fallbackImages: [
      '/img/ssot.svg',
    ]
  },

  // Migration
  {
    category: 'migration',
    keywords: ['migration', 'upgrade', 'v3', 'transition', 'change', 'move', 'convert'],
    featuredImage: '/blog/migration-guide/cover.svg',
    contentImages: [
      '/blog/migration-guide/cover.svg',
      '/img/dev-workflow-dark.png',
    ],
    fallbackImages: [
      '/blog/zenstack-v3-beta/cover.svg',
    ]
  },

  // Real-time Applications
  {
    category: 'realtime',
    keywords: ['realtime', 'real-time', 'websocket', 'live', 'streaming', 'instant', 'sync'],
    featuredImage: '/blog/real-time-applications/cover.svg',
    contentImages: [
      '/blog/real-time-applications/cover.svg',
      '/img/home/server-adapter-nextjs.png',
    ],
    fallbackImages: [
      '/img/home/client-hooks.png',
    ]
  },

  // Finance & Investment
  {
    category: 'finance',
    keywords: ['finance', 'investment', 'wealth', 'capital', 'gamification', 'trading', 'money', 'crypto'],
    featuredImage: '/bg-tokenizin-light.png',
    contentImages: [
      '/bg-tokenizin-light.png',
      '/bg-tokenizin-dark.png',
      '/apple-touch-icon-tiger.png',
      '/playlogo.png',
    ],
    fallbackImages: [
      '/apple-touch-icon-casino-chip.png',
      '/favicon-casino-chip.svg',
    ]
  },

  // SaaS & Products
  {
    category: 'saas',
    keywords: ['saas', 'software', 'product', 'startup', 'b2b', 'b2c', 'service'],
    featuredImage: '/img/home/saas.png',
    contentImages: [
      '/img/home/saas.png',
      '/img/home/b2c.png',
      '/img/home/internal-tools.png',
    ],
    fallbackImages: [
      '/img/t3app.png',
    ]
  },

  // Framework Integrations
  {
    category: 'framework',
    keywords: ['nextjs', 'react', 'express', 'fastify', 'nuxt', 'svelte', 'sveltekit', 'nest', 'framework'],
    featuredImage: '/img/home/server-adapter-nextjs.png',
    contentImages: [
      '/img/home/server-adapter-nextjs.png',
      '/img/home/server-adapter-express.png',
      '/img/home/server-adapter-fastify.png',
      '/img/home/server-adapter-nuxt.png',
      '/img/home/server-adapter-sveltekit.png',
    ],
    fallbackImages: [
      '/img/intro/zenstack-nextjs-light.png',
    ]
  },
];

// Default fallback images
export const DEFAULT_BLOG_IMAGES = {
  featuredImage: '/blog/performance-optimization/cover.svg',
  contentImages: [
    '/img/ai-friendly.png',
    '/img/home/saas.png',
    '/img/intro/zenstack-layers-light.png',
  ],
};

/**
 * Find best matching image for blog post based on title, content, category, and tags
 */
export function findBestBlogImage(
  title: string,
  content: string,
  category?: string | null,
  tags?: string[] | null
): string {
  const searchText = `${title} ${content} ${category || ''} ${tags?.join(' ') || ''}`.toLowerCase();
  
  // Try exact category match first
  if (category) {
    const categoryMatch = BLOG_IMAGE_MAPPINGS.find(
      mapping => mapping.category.toLowerCase() === category.toLowerCase()
    );
    if (categoryMatch) {
      return categoryMatch.featuredImage;
    }
  }

  // Try keyword matching
  for (const mapping of BLOG_IMAGE_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return mapping.featuredImage;
      }
    }
  }

  // Return default fallback
  return DEFAULT_BLOG_IMAGES.featuredImage;
}

/**
 * Get content images for a blog post
 */
export function getContentImages(
  title: string,
  content: string,
  category?: string | null,
  tags?: string[] | null,
  limit: number = 3
): string[] {
  const searchText = `${title} ${content} ${category || ''} ${tags?.join(' ') || ''}`.toLowerCase();
  const matchedImages: string[] = [];

  // Try exact category match first
  if (category) {
    const categoryMatch = BLOG_IMAGE_MAPPINGS.find(
      mapping => mapping.category.toLowerCase() === category.toLowerCase()
    );
    if (categoryMatch) {
      matchedImages.push(...categoryMatch.contentImages.slice(0, limit));
    }
  }

  // Try keyword matching if we need more images
  if (matchedImages.length < limit) {
    for (const mapping of BLOG_IMAGE_MAPPINGS) {
      if (matchedImages.length >= limit) break;
      
      for (const keyword of mapping.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          const remainingSlots = limit - matchedImages.length;
          matchedImages.push(...mapping.contentImages.slice(0, remainingSlots));
          break;
        }
      }
    }
  }

  // Fill with defaults if needed
  if (matchedImages.length < limit) {
    const remainingSlots = limit - matchedImages.length;
    matchedImages.push(...DEFAULT_BLOG_IMAGES.contentImages.slice(0, remainingSlots));
  }

  // Remove duplicates and return
  return Array.from(new Set(matchedImages)).slice(0, limit);
}

/**
 * Auto-assign featured image to blog post if not already set
 */
export function autoAssignFeaturedImage(blogPost: {
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  featuredImage?: string | null;
}): string {
  // If already has a featured image, don't override
  if (blogPost.featuredImage && blogPost.featuredImage.trim() !== '') {
    return blogPost.featuredImage;
  }

  // Auto-assign based on content
  return findBestBlogImage(
    blogPost.title,
    blogPost.content,
    blogPost.category,
    Array.isArray(blogPost.tags) ? blogPost.tags : []
  );
}

/**
 * Get all image suggestions for a blog post
 */
export function getBlogImageSuggestions(blogPost: {
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
}): {
  featuredImage: string;
  contentImages: string[];
  alternativeFeaturedImages: string[];
} {
  const searchText = `${blogPost.title} ${blogPost.content} ${blogPost.category || ''} ${blogPost.tags?.join(' ') || ''}`.toLowerCase();
  
  const featuredImage = findBestBlogImage(
    blogPost.title,
    blogPost.content,
    blogPost.category,
    Array.isArray(blogPost.tags) ? blogPost.tags : []
  );

  const contentImages = getContentImages(
    blogPost.title,
    blogPost.content,
    blogPost.category,
    Array.isArray(blogPost.tags) ? blogPost.tags : [],
    5
  );

  // Find alternative featured images from matching mappings
  const alternativeFeaturedImages: string[] = [];
  for (const mapping of BLOG_IMAGE_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        alternativeFeaturedImages.push(...mapping.fallbackImages);
        break;
      }
    }
  }

  return {
    featuredImage,
    contentImages,
    alternativeFeaturedImages: Array.from(new Set(alternativeFeaturedImages)).slice(0, 5),
  };
}

