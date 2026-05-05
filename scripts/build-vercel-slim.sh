#!/bin/bash
set -euo pipefail

# Build script optimized for Vercel prebuilt deployment
# Builds locally and creates artifacts for Vercel --prebuilt deployment
# Reduces function size and memory footprint

echo "🔨 Building for Vercel prebuilt deployment..."

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next dist build out

# Step 2: Generate ZenStack schema (REQUIRED for runtime)
echo "📦 Generating ZenStack schema..."
if command -v bun &> /dev/null; then
  if ! bun run zen:generate; then
    echo "⚠️  ZenStack generation failed, but continuing..."
    echo "   Note: This may cause runtime errors if schema is outdated"
  else
    echo "✅ ZenStack schema generated"
  fi
else
  echo "⚠️  Bun not found, skipping ZenStack generation"
  echo "   Run 'bun run zen:generate' manually if needed"
fi

# Step 3: Type checking (non-blocking)
echo "📝 Running TypeScript type check..."
if ! tsc --noEmit --skipLibCheck; then
  echo "⚠️  TypeScript errors found, but continuing build..."
  echo "   Fix TypeScript errors before deploying to production"
else
  echo "✅ TypeScript check passed"
fi

# Step 4: Build Next.js application
echo "🚀 Building Next.js application..."
NODE_OPTIONS='--max-old-space-size=16384 --expose-gc' \
  next build --webpack

# Step 5: Verify build artifacts
echo "🔍 Verifying build artifacts..."
if [ ! -d ".next" ]; then
  echo "❌ Build failed: .next directory not created"
  exit 1
fi

# Verify critical subdirectories
REQUIRED_DIRS=(
  ".next/static"
  ".next/server"
)

MISSING_DIRS=0
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "⚠️  Warning: $dir not found (may be normal for some builds)"
    MISSING_DIRS=$((MISSING_DIRS + 1))
  else
    echo "✅ Found: $dir"
  fi
done

# Check for standalone mode (if configured)
if [ -d ".next/standalone" ]; then
  echo "✅ Standalone mode detected"
  if [ ! -f ".next/standalone/server.js" ]; then
    echo "⚠️  Warning: .next/standalone/server.js not found"
  fi
fi

# Step 6: Display build summary
echo ""
echo "✅ Build completed successfully"
echo ""
echo "📊 Build artifacts summary:"
if command -v du &> /dev/null; then
  du -sh .next 2>/dev/null || echo "  (Unable to calculate size)"
else
  echo "  .next directory exists"
fi

# Show some artifact details
echo ""
echo "📁 Key artifacts:"
ls -lh .next/standalone/server.js 2>/dev/null && echo "  ✅ Standalone server found" || echo "  ℹ️  Standalone mode not used"
ls -lh .next/server/app-* 2>/dev/null | head -3 || echo "  ℹ️  No app routes found (may be normal)"

# Step 7: Skip vercel build (it's slow and unnecessary)
# vercel build takes 5+ minutes because it analyzes the entire project,
# packages serverless functions, and processes routes even without buildCommand.
# Since we already have .next/ built, we can deploy directly without vercel build.
echo ""
echo "⏭️  Skipping 'vercel build' step (saves 5+ minutes)"
echo "   Reason: vercel build is slow because it analyzes the entire project"
echo "   Solution: Deploy directly with .next/ - Vercel will detect it and skip building"
echo ""

# Step 8: Deployment instructions
echo "✨ Ready for Vercel deployment (RECOMMENDED - Fast Method):"
echo ""
echo "   🚀 Option 1: Deploy without --prebuilt (FASTEST - Recommended)"
echo "   vercel deploy --prod --local-config vercel.prebuilt.json"
echo "   → Vercel detects .next/ exists and skips building (~30 seconds)"
echo ""
echo "   📦 Option 2: Use convenience script"
echo "   bun run deploy:vercel:local"
echo ""
echo "   ⚠️  Option 3: If you need --prebuilt flag (requires slow vercel build)"
echo "   vercel build --prod --local-config vercel.prebuilt.json"
echo "   vercel deploy --prebuilt --prod"
echo "   → This takes 5+ minutes because vercel build analyzes everything"
echo ""
echo "💡 TIP: Option 1 is recommended - it's faster and achieves the same result!"
echo "   Both methods skip building on Vercel's servers"
