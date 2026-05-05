import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint config removed - use next lint command instead
  output: 'standalone',
  // Optimize for Vercel serverless functions
  compress: true,
  poweredByHeader: false,
  generateBuildId: async () => {
    // Use deterministic build ID for better caching and deployment reliability
    // Fallback to timestamp if no CI/CD build ID available
    // For Vercel, use commit SHA; for local builds, use timestamp
    const buildId = process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`;
    console.log(`[BUILD] Generated build ID: ${buildId}`);
    return buildId;
  },
  // Transpile AppKit module package for proper compilation
  // Note: Next.js SWC will transpile TypeScript files from this package
  // The package must be properly linked in node_modules or workspace
  transpilePackages: ['@TKNZN/reown-appkit-module'],
  
  // Note: SWC minification is enabled by default in Next.js 13+
  // No need to explicitly set swcMinify
  experimental: {
    optimizePackageImports: ['lucide-react', '@zenstackhq/orm', 'kysely'],
    webpackMemoryOptimizations: true,
    optimizeCss: true,
    scrollRestoration: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
      {
        // Add Permissions-Policy header for all routes to allow clipboard access for AppKit
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'clipboard-read=self, clipboard-write=self',
          },
        ],
      },
    ];
  },
  serverExternalPackages: [
    '@ai-sdk/anthropic',
    '@ai-sdk/deepinfra',
    '@ai-sdk/openai',
    '@ai-sdk/xai',
    '@ai-sdk/groq',
    'ai',
    'openai',
    'framer-motion', // Prevent SSR issues with framer-motion
    '@metamask/sdk', // Externalize MetaMask SDK (React Native modules handled by webpack replacement)
    '@modelcontextprotocol/sdk', // Externalize MCP SDK
    // Large dependencies that should be externalized
    '@docusaurus/core',
    '@docusaurus/preset-classic',
    '@docusaurus/theme-classic',
    'sharp', // Image processing - large dependency
    'pdfkit', // PDF generation - large dependency
    'tesseract.js', // OCR - very large dependency
    'pdfjs-dist', // PDF.js - large dependency
    'better-sqlite3', // SQLite - native module
    'ethers', // Ethereum library - large
    // Note: viem and wagmi are NOT externalized - Turbopack handles them automatically
    // Adding them here causes "can't be external" warnings
  ],
  env: {
    NEXT_PUBLIC_MAPBOX_API_KEY: process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
    NEXT_PUBLIC_USER_FILE_SIZE_LIMIT: process.env.NEXT_PUBLIC_USER_FILE_SIZE_LIMIT || '10485760',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '2niqosv6fviw7gqw.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      // Allow WalletConnect wallet icons
      {
        protocol: 'https',
        hostname: 'api.web3modal.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'explorer-api.walletconnect.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.walletconnect.org',
        pathname: '/**',
      },
      // Allow CoinGecko token icons
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/**',
      },
      // Allow QR code API
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  webpack: (config, { isServer, dev }) => {
    // Memory optimizations for large builds
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        compression: 'gzip',
        hashAlgorithm: 'xxhash64',
        maxMemoryGenerations: 0, // Disable in-memory cache generations to save memory
        maxAge: 1000 * 60 * 5,
      };

      // Optimize chunk splitting for large generated codebases
      config.optimization = {
        ...config.optimization,
        // Reduce memory usage during build
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          // Reduce max chunk size to prevent memory issues
          maxSize: 244000, // ~240KB chunks
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Separate generated components into their own chunks
            generated: {
              test: /[\\/]src[\\/]generated[\\/]/,
              name: 'generated',
              chunks: 'all',
              priority: 10,
              enforce: true,
              maxSize: 244000,
            },
            // Separate framework libraries
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
              maxSize: 244000,
            },
            // Separate large libraries
            lib: {
              test: /[\\/]node_modules[\\/](@zenstackhq|kysely|@prisma|lucide-react)[\\/]/,
              name: 'lib',
              chunks: 'all',
              priority: 30,
              maxSize: 244000,
            },
          },
        },
      };
      
      // Reduce parallelism to prevent memory exhaustion
      config.parallelism = 1;
    }

    // CRITICAL: Next.js SWC automatically transpiles packages listed in transpilePackages
    // The @TKNZN/reown-appkit-module package is configured in transpilePackages above
    // Webpack aliases pointing to .ts files will be transpiled by SWC before bundling

    // Path aliases - MUST be set for both client and server
    // These aliases are required for Next.js to resolve @/ imports correctly
    // IMPORTANT: Aliases must point to actual files/directories that exist
    const libDbPath = path.resolve(__dirname, 'src/lib/db.ts');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/lib/db': libDbPath, // Explicit alias pointing to actual file with extension
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/stores': path.resolve(__dirname, 'src/stores'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/context': path.resolve(__dirname, 'src/context'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@TKNZN/reown-appkit-module': path.resolve(__dirname, 'src/config/index.ts'),
      // ZenStack schema alias - points to workspace root schema.ts
      '@zenstack/schema': path.resolve(__dirname, '../../schema.ts'),
      // Stub React Native modules to prevent MetaMask SDK import errors
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/lib/stubs/@react-native-async-storage/async-storage.js'),
      'react-native': path.resolve(__dirname, 'src/lib/stubs/react-native.js'),
      'react-native-get-random-values': path.resolve(__dirname, 'src/lib/stubs/react-native-get-random-values.js'),
    };

    // Ensure TypeScript extensions are resolved correctly
    config.resolve.extensions = [
      ...(config.resolve.extensions || []),
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
    ];

    // Allow resolving paths outside src/ directory (for smart-contracts artifacts)
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, '.'),
      path.resolve(__dirname, 'src'),
    ];

    const webpack = require('webpack');
    
    // Ensure plugins array exists
    if (!config.plugins) {
      config.plugins = [];
    }
    
    // CRITICAL: Force webpack to resolve @/lib/db alias correctly
    // Use NormalModuleReplacementPlugin to ensure alias is resolved during compilation
    if (isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^@\/lib\/db$/,
          (resource) => {
            resource.request = path.resolve(__dirname, 'src/lib/db.ts');
          }
        )
      );
    }
    
    // Replace React Native modules with stubs (both client and server)
    // This prevents MetaMask SDK from trying to import React Native modules
    // Use NormalModuleReplacementPlugin instead of IgnorePlugin to provide stubs
    const asyncStorageStub = path.resolve(__dirname, 'lib/stubs/@react-native-async-storage/async-storage.js');
    const reactNativeStub = path.resolve(__dirname, 'lib/stubs/react-native.js');
    const getRandomValuesStub = path.resolve(__dirname, 'lib/stubs/react-native-get-random-values.js');
    
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@react-native-async-storage\/async-storage$/,
        (resource) => {
          resource.request = asyncStorageStub;
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^react-native$/,
        (resource) => {
          resource.request = reactNativeStub;
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^react-native-get-random-values$/,
        (resource) => {
          resource.request = getRandomValuesStub;
        }
      )
    );

    // Ignore MCP server path resolution during build (it's resolved at runtime)
    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource) {
            // Ignore any attempts to resolve mcp-server paths statically
            return resource.includes('mcp-server/dist/index.js') || resource.includes('ROOT/mcp-server');
          },
        })
      );
    }

    // Handle missing smart-contracts artifacts gracefully during build
    // Always replace artifact imports with stub during Vercel builds (artifacts excluded)
    const stubPath = path.resolve(__dirname, 'src/lib/stubs/empty-abi-stub.json');
    
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /smart-contracts\/artifacts\/contracts\/(core|upgradeable)\/.*\.json$/,
        (resource) => {
          // During Vercel builds, artifacts are excluded - always use stub
          // In local dev, check if file exists
          const isVercelBuild = process.env.VERCEL === '1';
          
          if (isVercelBuild) {
            // Always use stub during Vercel builds
            resource.request = stubPath;
            return;
          }
          
          // In local dev, check if file exists
          try {
            const requestedPath = path.resolve(resource.context || __dirname, resource.request);
            if (!fs.existsSync(requestedPath)) {
              resource.request = stubPath;
            }
          } catch {
            // If we can't resolve, use stub
            resource.request = stubPath;
          }
        }
      )
    );

    // Handle missing plugins/templates files gracefully during build
    // These files may not be available during Vercel builds
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /plugins\/templates\/enhanced-content-editor-template/,
        async (resource) => {
          // Replace with a stub module that exports empty functions
          const stubPath = path.resolve(__dirname, 'src/lib/stubs/enhanced-content-editor-template-stub.js');
          
          // Create stub file if it doesn't exist
          if (!fs.existsSync(stubPath)) {
            const stubContent = `
module.exports = {
  generateEnhancedFormTemplate: () => '',
  generateEnhancedDialogTemplate: () => '',
  CONTENT_EDITOR_CONFIGS: [],
};
`;
            fs.writeFileSync(stubPath, stubContent);
          }
          
          resource.request = stubPath;
        }
      )
    );

    // CRITICAL: Fallback for @TKNZN/reown-appkit-module scoped package resolution
    // This intercepts ALL @TKNZN/reown-appkit-module imports and maps them to actual file paths
    // This works even if the package isn't linked in node_modules during Vercel build
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@TKNZN\/reown-appkit-module(\/.*)?$/,
        async (resource) => {
          const match = resource.request.match(/^@TKNZN\/reown-appkit-module(\/.*)?$/);
          const subPath = match ? match[1] : '';
          
          // Map import paths to actual file locations
          let targetPath;
          if (subPath === '/components' || subPath === '/components/') {
            targetPath = path.resolve(__dirname, 'src/components/index.ts');
          } else if (subPath === '/context' || subPath === '/context/') {
            targetPath = path.resolve(__dirname, 'src/context/index.tsx');
          } else if (subPath === '/theme' || subPath === '/theme/') {
            targetPath = path.resolve(__dirname, 'src/theme/tokenizin-palace-theme.ts');
          } else if (subPath === '/styles' || subPath === '/styles/') {
            targetPath = path.resolve(__dirname, 'src/styles/tokenizin-appkit.css');
          } else if (subPath === '/config' || subPath === '/config/') {
            targetPath = path.resolve(__dirname, 'src/config/index.ts');
          } else if (!subPath || subPath === '/') {
            // Default to main config entry point
            targetPath = path.resolve(__dirname, 'src/config/index.ts');
          } else {
            // For any other subpath, try to resolve relative to src directory
            const relativePath = subPath.replace(/^\//, '');
            targetPath = path.resolve(__dirname, 'src', relativePath);
          }

          // Verify file exists, fallback to main entry if not
          if (!fs.existsSync(targetPath)) {
            console.warn(`⚠️  [Webpack] @TKNZN/reown-appkit-module${subPath} not found at ${targetPath}, using main entry`);
            targetPath = path.resolve(__dirname, 'src/config/index.ts');
          }
          
          resource.request = targetPath;
        }
      )
    );

    // Handle missing scripts/sync-test-failures-to-generation during Vercel builds
    // This script is excluded by .vercelignore but plugins/index.ts tries to import it
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /scripts\/sync-test-failures-to-generation/,
        async (resource) => {
          const stubPath = path.resolve(__dirname, 'src/lib/stubs/sync-test-failures-stub.js');
          
          // Create stub file if it doesn't exist
          if (!fs.existsSync(stubPath)) {
            const stubDir = path.dirname(stubPath);
            if (!fs.existsSync(stubDir)) {
              fs.mkdirSync(stubDir, { recursive: true });
            }
            
            const stubContent = `
// Stub for sync-test-failures-to-generation script (not available during Vercel builds)
module.exports = {
  syncTestFailuresToGeneration: async () => {
    console.warn('⚠️  Test failure sync script not available (expected during Vercel builds)');
    return Promise.resolve();
  }
};
`;
            fs.writeFileSync(stubPath, stubContent);
          }
          
          resource.request = stubPath;
        }
      )
    );

    // Add ignore warnings for React Native modules
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@react-native-async-storage\/async-storage/ },
      { module: /react-native/ },
      { module: /@metamask\/sdk/ },
    ];

    // Ignore optional wallet connector dependencies that aren't installed
    // These are optional peer dependencies of @wagmi/connectors
    // We don't use these connectors, so we can safely ignore them
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@coinbase\/wallet-sdk$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@gemini-wallet\/core$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^porto$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@walletconnect\/ethereum-provider$/,
      })
    );

    // Handle transitive dependencies from wagmi connectors - prevent SSR import errors
    // MetaMask SDK is a transitive dependency: wagmi → @wagmi/connectors → @metamask/sdk
    // This webpack config prevents SSR build errors when MetaMask SDK tries to import React Native modules
    // We don't directly use MetaMask SDK - AppKit/wagmi handles all wallet connectivity
    if (isServer && !dev) {
      // Externalize large dependencies in production builds to reduce serverless function size
      const largeDependencies = [
        'sharp',
        'pdfkit',
        'tesseract.js',
        'pdfjs-dist',
        'better-sqlite3',
        '@docusaurus/core',
        '@docusaurus/preset-classic',
        '@docusaurus/theme-classic',
      ];

      // Add externals configuration for serverless functions
      if (!config.externals) {
        config.externals = [];
      }
      
      // Externalize large dependencies
      // Exclude pg and related modules from client bundles
      // NOTE: @/lib/db is NOT externalized - it must be bundled so webpack can resolve the alias
      config.externals.push(({ request }, callback) => {
        if (
          request === 'pg' || 
          request === 'pg-native' || 
          request?.includes('pg/lib')
          // @/lib/db is intentionally NOT externalized - webpack must resolve the alias
        ) {
          return callback(null, `commonjs ${request}`);
        }
        if (largeDependencies.some(dep => request === dep || request.startsWith(`${dep}/`))) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });

      // Replace @/lib/db with a stub in client bundles to prevent pg bundling
      if (!isServer) {
        // Replace db.ts imports with client stub (must be first to catch all imports)
        config.plugins.unshift(
          new webpack.NormalModuleReplacementPlugin(
            /^@\/lib\/db$/,
            path.resolve(__dirname, 'src/lib/db.client-stub.ts')
          )
        );
        
          // Also ignore pg and related modules completely in client bundles
          config.plugins.push(
            new webpack.IgnorePlugin({
              resourceRegExp: /^pg$/,
            }),
            new webpack.IgnorePlugin({
              resourceRegExp: /^pg-native$/,
            }),
            new webpack.IgnorePlugin({
              resourceRegExp: /pg\/lib\/native/,
            }),
            new webpack.IgnorePlugin({
              resourceRegExp: /kysely/,
            }),
            // Ignore Node.js built-in 'module' package in client bundles
            new webpack.IgnorePlugin({
              resourceRegExp: /^module$/,
            })
          );
      }

      // On server side, ignore browser-specific wallet SDK modules from transitive dependencies
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@metamask\/sdk\/dist\/browser/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /@metamask\/sdk\/dist\/browser\/es\/metamask-sdk\.js/,
        })
      );
      
      // Also ignore browser-specific wallet SDK imports (transitive deps only)
      config.resolve.alias = {
        ...config.resolve.alias,
        '@metamask/sdk/dist/browser/es/metamask-sdk.js': false,
        '@metamask/sdk/dist/browser': false,
        '@metamask/sdk': false, // Ignore transitive dependency on server
      };
      
      // Add fallback to prevent resolution
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@metamask/sdk': false,
        '@metamask/sdk/dist/browser': false,
      };
    }

    // Set up fallbacks for client-side only (server has different handling)
    if (!isServer) {
      // IMPORTANT: Only override specific aliases for client bundles
      // Keep the base @/lib alias intact so server-side code can still resolve it
      const clientAliases = {
        'tesseract.js': false,
        'pdfjs-dist': false,
        'sharp': false,
        // Exclude database client and pg modules from client bundles
        // Note: '@/lib/db' is handled by NormalModuleReplacementPlugin above, not here
        'pg': false,
        'pg-native': false,
        'kysely': false,
        'module': false, // Node.js built-in module
        // Optional wallet connector dependencies (not installed, ignore)
        '@coinbase/wallet-sdk': false,
        '@gemini-wallet/core': false,
        'porto': false,
        '@walletconnect/ethereum-provider': false,
      };
      
      // Merge client-specific aliases without overwriting base aliases
      config.resolve.alias = {
        ...config.resolve.alias,
        ...clientAliases,
      };

          config.resolve.fallback = {
            ...config.resolve.fallback,
            'fs': false,
            'net': false,
            'tls': false,
            'crypto': false,
            'canvas': false,
            'dns': false,
            'pg': false,
            'pg-native': false,
            'kysely': false,
            'module': false, // Node.js built-in module
            // Optional wallet connector dependencies (not installed, ignore)
            '@coinbase/wallet-sdk': false,
            '@gemini-wallet/core': false,
            'porto': false,
            '@walletconnect/ethereum-provider': false,
          };
    }
    
    // Ensure server-side aliases are always set (even if client config ran first)
    if (isServer) {
      // Re-apply base aliases for server-side to ensure they're not overwritten
      const libDbPath = path.resolve(__dirname, 'src/lib/db.ts');
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib': path.resolve(__dirname, 'src/lib'),
        '@/lib/db': libDbPath, // Explicit alias pointing to actual file with extension
        '@/components': path.resolve(__dirname, 'src/components'),
        '@/stores': path.resolve(__dirname, 'src/stores'),
        '@/hooks': path.resolve(__dirname, 'src/hooks'),
        '@/config': path.resolve(__dirname, 'src/config'),
        '@/context': path.resolve(__dirname, 'src/context'),
        '@/utils': path.resolve(__dirname, 'src/utils'),
      };
    }

    return config;
  },
};

export default nextConfig;
