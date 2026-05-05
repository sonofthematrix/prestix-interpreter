// Navigation bridge for Fumadocs integration
export function generateFumadocsLayoutProps() {
  return {
    tree: [
      {
        name: 'AI Documentation',
        url: '/ai-docs',
        children: [
          {
            name: 'Brand Guide',
            url: '/ai-docs/brand-guide',
          },
          {
            name: 'User Manual',
            url: '/ai-docs/user-manual',
          },
          {
            name: 'Tutorials',
            url: '/ai-docs/tutorials',
          },
          {
            name: 'API Documentation',
            url: '/ai-docs/api',
          },
          {
            name: 'News & Updates',
            url: '/ai-docs/news',
          },
        ],
      },
    ],
    nav: {
      title: 'ZenStack AI Docs',
      url: '/ai-docs',
    },
  };
}

// Breadcrumb generation for navigation
export interface BreadcrumbItem {
  title: string;
  url: string;
}

export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Handle root path
  if (pathname === '/') {
    return breadcrumbs;
  }

  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumbs step by step
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    let title = segment.charAt(0).toUpperCase() + segment.slice(1);

    // Special cases for better titles
    switch (segment) {
      case 'blog':
        title = 'Blog';
        break;
      case 'docs':
        title = 'Documentation';
        break;
      case 'ai-docs':
        title = 'AI Documentation';
        break;
      case 'admin':
        title = 'Administration';
        break;
      default:
        // Convert kebab-case to Title Case
        title = title.replace(/-/g, ' ');
        title = title.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
    }

    breadcrumbs.push({
      title,
      url: currentPath
    });
  });

  return breadcrumbs;
}
