import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function resolveMultiformatsPath() {
  const root = path.join(__dirname, 'node_modules');
  const direct = path.join(root, 'multiformats');
  if (fs.existsSync(direct)) return direct;
  const bunDir = path.join(root, '.bun');
  if (fs.existsSync(bunDir)) {
    try {
      const dirs = fs.readdirSync(bunDir);
      const mf = dirs.find((d) => d.startsWith('multiformats@'));
      if (mf) {
        const p = path.join(bunDir, mf, 'node_modules', 'multiformats');
        if (fs.existsSync(p)) return p;
      }
    } catch (_) {}
  }
  return direct;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo/sandbox: pin tracing + silence "multiple lockfiles" / Turbopack+webpack mismatch (Next 16 defaults to Turbopack for build).
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {},
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  reactStrictMode: false, // TODO Phase 1: enable after voice SPA decomposition
  // TODO: Remove these three lines once all type errors are resolved.
  // Run `bun run type-check` to see current errors.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip static generation - app uses client-side hooks that require browser APIs
  output: process.env.VERCEL === '1' ? undefined : 'standalone',
  generateBuildId: async () => {
    return 'build-stable';
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      {
        source: '/images/:path(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/logos/app-icon/:filename',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    // Root `/` serves the Prestix control room (`src/app/page.tsx`). Legacy full voice UI: `/voice`.
    return [];
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/wallet/verify',
        destination: '/api/wallet-verify',
      },
    ];
  },
  images: {
    // loader: 'custom',
    // loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    // Local image paths: /** matches all public assets (root + subdirs) and /api/blob with query strings
    localPatterns: [{ pathname: '/**' }],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@esbuild/**',
      'node_modules/.bun/@esbuild+*/**',
      'node_modules/**/*.map',
      '**/*.map',
      'node_modules/.cache/**',
      '.cache/**',
      'node_modules/typescript/**',
      'node_modules/.bun/typescript@*/**',
      'node_modules/terser/**',
      'node_modules/.bun/terser@*/**',
    ],
  },
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
    ],
    optimizeCss: false,
    webpackBuildWorker: process.env.DISABLE_WEBPACK_BUILD_WORKER === '1' ? false : true,
    webpackMemoryOptimizations: true,
    preloadEntriesOnStart: false,
  },
  // Ensure our patched TokenUtil.ts is transpiled
  transpilePackages: ['@reown/appkit-utils'],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.output = config.output || {};
      config.output.chunkLoadTimeout = 180000;
    }

    const isVercelBuild = process.env.VERCEL === '1';
    if (isVercelBuild) {
      config.cache = false;
    } else {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    const multiformatsPath = resolveMultiformatsPath();
    const appkitControllersShimDir = path.join(__dirname, 'src', 'lib', 'appkit-controllers-shim');
    const appkitUtilsShimDir = path.join(__dirname, 'src', 'lib', 'appkit-utils-shim');
    const appkitUtilsPatchedDir = path.join(__dirname, 'src', 'lib', 'appkit-utils-patched');

    const patchedTokenUtilPath = path.join(appkitUtilsPatchedDir, 'TokenUtil.ts');
    
    config.resolve.alias = {
      ...config.resolve.alias,
      'multiformats': multiformatsPath,
      'multiformats/basics': path.join(multiformatsPath, 'esm', 'src', 'basics.js'),
      'multiformats/vendor/varint.js': path.join(multiformatsPath, 'vendor', 'varint.js'),
      // ❌ REMOVED: Don't alias @reown/appkit-controllers - it causes "Class extends value #<Object> is not a constructor"
      // The shim exports plain objects instead of classes, which breaks class extension in AppKit's universal adapter
      // Let the real @reown/appkit-controllers package load instead
      // '@reown/appkit-controllers': appkitControllersShimDir,
      // '@reown/appkit-controllers/features': path.join(appkitControllersShimDir, 'features'),
      // '@reown/appkit-controllers/react': path.join(appkitControllersShimDir, 'react'),
      // ✅ CRITICAL: Replace TokenUtil.js with patched TypeScript version to prevent "Cannot read properties of null (reading 'asset')"
      // The original TokenUtil.js tries to access baseUSDC.asset and baseSepoliaUSDC.asset during module initialization,
      // but these can be null, causing the error. Our patched version safely handles null values.
      // Multiple alias patterns to catch all import variations
      '@reown/appkit-utils/dist/esm/src/TokenUtil.js': patchedTokenUtilPath,
      '@reown/appkit-utils/dist/esm/src/TokenUtil': patchedTokenUtilPath,
      // ❌ REMOVED: Don't alias @reown/appkit-utils - it causes circular dependency
      // Instead, patch missing exports at runtime in appkit.ts
      // ✅ Ignore missing optional connector dependencies - these are only needed if using specific connectors
      // @wagmi/connectors tries to import them but they're optional peer dependencies
      'porto/internal': false,
      'porto': false,
      '@coinbase/wallet-sdk': false,
      '@metamask/sdk': false,
      '@walletconnect/ethereum-provider': false,
    };

    // ✅ Use NormalModuleReplacementPlugin to replace TokenUtil.js more reliably
    // This ensures the patched version is used even if the alias doesn't match
    // Apply to both client and server builds
    try {
      // Use require (via createRequire at top level) for webpack in ES module context
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      const patchedTokenUtilPathResolved = path.resolve(__dirname, 'src', 'lib', 'appkit-utils-patched', 'TokenUtil.ts');
      
      // Custom resolver plugin that runs early in the resolution process
      // This ensures TokenUtil is replaced before webpack resolves the module
      class TokenUtilResolverPlugin {
        apply(compiler) {
          compiler.hooks.normalModuleFactory.tap('TokenUtilResolverPlugin', (nmf) => {
            nmf.hooks.beforeResolve.tap('TokenUtilResolverPlugin', (data) => {
              if (data && data.request && typeof data.request === 'string') {
                // Match any import of TokenUtil from @reown/appkit-utils
                if (data.request.includes('@reown/appkit-utils') && data.request.includes('TokenUtil')) {
                  console.log(`[webpack] ✅ TokenUtilResolverPlugin: Replacing ${data.request} with patched version`);
                  data.request = patchedTokenUtilPathResolved;
                }
              }
            });
          });
        }
      }
      
      config.plugins.push(new TokenUtilResolverPlugin());
      
      // Also use NormalModuleReplacementPlugin as fallback
      // More aggressive regex to catch ALL possible import patterns
      // Match both forward and backslashes, with or without .js extension, case-insensitive
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /TokenUtil(\.js)?$/i,
          (resource) => {
            // Only replace if it's from @reown/appkit-utils
            if (resource.request && resource.request.includes('@reown/appkit-utils') && resource.request.includes('TokenUtil')) {
              console.log(`[webpack] ✅ NormalModuleReplacementPlugin: Replacing TokenUtil with patched version`);
              console.log(`[webpack] Original request: ${resource.request}`);
              console.log(`[webpack] Patched path: ${patchedTokenUtilPathResolved}`);
              resource.request = patchedTokenUtilPathResolved;
            }
          }
        )
      );
      
      // Also add a more specific replacement for the exact path
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@reown[\/\\]appkit-utils[\/\\].*TokenUtil/i,
          (resource) => {
            console.log(`[webpack] ✅ NormalModuleReplacementPlugin (specific): Replacing TokenUtil with patched version`);
            console.log(`[webpack] Original request: ${resource.request}`);
            resource.request = patchedTokenUtilPathResolved;
          }
        )
      );
    } catch (e) {
      console.warn('[next.config.mjs] Could not add TokenUtil replacement plugins:', e);
    }

    // Ensure zod is properly resolved for @zenstackhq/orm
    // Prevent webpack from incorrectly tree-shaking zod exports
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'zod': path.join(__dirname, 'node_modules', 'zod'),
      };
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
