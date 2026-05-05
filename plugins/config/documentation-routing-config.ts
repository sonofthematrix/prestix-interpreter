/**
 * Documentation Routing Configuration
 * 
 * This configuration ensures that auto-generation plugins respect
 * the documentation landing page structure and routing behavior.
 */

export interface DocumentationRoutingConfig {
  landingPage: {
    route: string;
    component: string;
    description: string;
  };
  welcomePage: {
    route: string;
    component: string;
    description: string;
  };
  redirects: {
    enabled: boolean;
    rules: Array<{
      from: string;
      to: string;
      permanent: boolean;
      reason: string;
    }>;
  };
  navigation: {
    baseUrl: string;
    sections: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
}

/**
 * Current Documentation Routing Configuration
 * 
 * Updated: 2024-10-22
 * Changes: Removed automatic redirect from /docs to /docs/welcome
 * Reason: /docs should serve the documentation landing page directly
 */
export const DOCUMENTATION_ROUTING_CONFIG: DocumentationRoutingConfig = {
  landingPage: {
    route: '/docs',
    component: 'src/app/docs/page.tsx',
    description: 'Main documentation landing page with search, filtering, and grid display'
  },
  welcomePage: {
    route: '/docs/welcome',
    component: 'src/app/docs/welcome/page.tsx',
    description: 'Welcome/getting started page for new users'
  },
  redirects: {
    enabled: false, // IMPORTANT: No automatic redirect from /docs to /docs/welcome
    rules: [
      // No redirects - /docs serves the landing page directly
      // Users can navigate to /docs/welcome manually if needed
    ]
  },
  navigation: {
    baseUrl: '/docs',
    sections: [
      {
        title: 'Documentation Home',
        url: '/docs',
        description: 'Main documentation landing page with all available docs'
      },
      {
        title: 'Get Started',
        url: '/docs/welcome',
        description: 'Welcome and quick start guide'
      },
      {
        title: 'User Guides',
        url: '/docs/guides/user-guides-complete',
        description: 'Complete user documentation and guides'
      },
      {
        title: 'QTech Integration',
        url: '/docs/guides/qtech-integration-complete',
        description: 'Complete QTech gaming platform integration guide'
      },
      {
        title: 'Development Workflows',
        url: '/docs/implementation/development/workflows-complete',
        description: 'Complete development workflows and best practices'
      },
      {
        title: 'Feature Implementation',
        url: '/docs/implementation/features/implementation-complete',
        description: 'Complete feature implementation reference'
      },
      {
        title: 'Blockchain Integration',
        url: '/docs/implementation/blockchain/integration-complete',
        description: 'Complete blockchain integration guide'
      },
      {
        title: 'System Architecture',
        url: '/docs/implementation/architecture/system-architecture-complete',
        description: 'Complete system architecture documentation'
      },
      {
        title: 'Setup & Configuration',
        url: '/docs/implementation/setup/setup-complete',
        description: 'Complete setup and configuration guide'
      },
      {
        title: 'Technical Reference',
        url: '/docs/reference/technical-reference-complete',
        description: 'Complete API references and technical specifications'
      },
      {
        title: 'Handbook',
        url: '/docs/the-complete-guide',
        description: 'Complete developer handbook'
      },
      {
        title: 'Reference',
        url: '/docs/category/reference',
        description: 'API and schema reference'
      }
    ]
  }
};

/**
 * Validation function to ensure routing configuration is correct
 */
export function validateDocumentationRouting(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that landing page route is /docs (not redirected)
  if (DOCUMENTATION_ROUTING_CONFIG.landingPage.route !== '/docs') {
    errors.push('Landing page route must be /docs');
  }

  // Check that redirects are disabled for /docs
  if (DOCUMENTATION_ROUTING_CONFIG.redirects.enabled) {
    const docsRedirect = DOCUMENTATION_ROUTING_CONFIG.redirects.rules.find(
      rule => rule.from === '/docs'
    );
    if (docsRedirect) {
      errors.push('Automatic redirect from /docs is not allowed - /docs should serve the landing page');
    }
  }

  // Check that welcome page is accessible but not the default
  if (DOCUMENTATION_ROUTING_CONFIG.welcomePage.route !== '/docs/welcome') {
    warnings.push('Welcome page should be at /docs/welcome for consistency');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate routing configuration for deployment
 */
export function generateDeploymentRouting(): {
  vercelRedirects: Array<{
    source: string;
    destination: string;
    permanent?: boolean;
  }>;
  nextjsRewrites: Array<{
    source: string;
    destination: string;
  }>;
} {
  const validation = validateDocumentationRouting();
  
  if (!validation.isValid) {
    throw new Error(`Invalid documentation routing configuration: ${validation.errors.join(', ')}`);
  }

  // Generate Vercel redirects (excluding /docs redirect)
  const vercelRedirects = DOCUMENTATION_ROUTING_CONFIG.redirects.rules
    .filter(rule => rule.from !== '/docs') // Never redirect /docs
    .map(rule => ({
      source: rule.from,
      destination: rule.to,
      permanent: rule.permanent
    }));

  // No rewrites needed for documentation routing
  const nextjsRewrites: Array<{ source: string; destination: string }> = [];

  return {
    vercelRedirects,
    nextjsRewrites
  };
}

/**
 * Get navigation configuration for auto-generation
 */
export function getNavigationConfig() {
  return DOCUMENTATION_ROUTING_CONFIG.navigation;
}

/**
 * Check if a route should be auto-generated
 */
export function shouldGenerateRoute(route: string): boolean {
  // Don't auto-generate the main landing page - it's manually crafted
  if (route === '/docs') {
    return false;
  }
  
  // Allow auto-generation for specific documentation pages
  return route.startsWith('/docs/') && route !== '/docs/welcome';
}

export default DOCUMENTATION_ROUTING_CONFIG;
