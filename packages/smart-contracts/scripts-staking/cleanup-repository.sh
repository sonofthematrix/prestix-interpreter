#!/bin/bash

# TPT Repository Cleanup Script
# Removes redundant and stale files before production launch

set -e  # Exit on any error

echo "🧹 Starting TPT repository cleanup..."
echo "======================================"

# Create backup
echo "📦 Creating backup..."
git add .
git commit -m "Pre-cleanup backup - $(date)" || echo "No changes to commit"
git tag "pre-cleanup-$(date +%Y%m%d-%H%M%S)" || echo "Tag already exists"

# Phase 1: Remove old ABI files
echo ""
echo "📄 Phase 1: Removing old ABI files..."
echo "-------------------------------------"
rm -f abis/TigerStaking*.json
rm -f abis/TigerRevenue*.json
rm -f abis/RewardDistributor*.json
rm -f abis/TPT*.json
rm -f abis/KageEcosystem.json
rm -f abis/types.ts
rm -f abis/integration-example.js
rm -f abis/README.md
echo "✅ Removed old ABI files"

# Phase 2: Remove redundant configs
echo ""
echo "⚙️ Phase 2: Removing redundant configs..."
echo "----------------------------------------"
rm -f hardhat.config.optimized.ts
rm -f hardhat.config.gas-optimized.ts
echo "✅ Removed redundant configs"

# Phase 3: Remove redundant docs
echo ""
echo "📚 Phase 3: Removing redundant documentation..."
echo "----------------------------------------------"
rm -f DEPLOYMENT_GUIDE.md
rm -f ENHANCED_DEPLOYMENT_GUIDE.md
rm -f DEPLOYMENT_ENHANCEMENT_SUMMARY.md
echo "✅ Removed redundant documentation"

# Phase 4: Remove analysis files
echo ""
echo "📊 Phase 4: Removing analysis files..."
echo "-------------------------------------"
rm -f OPTIMIZER_*.md
rm -f optimizer-runs-analysis.json
echo "✅ Removed analysis files"

# Phase 5: Remove flattened files
echo ""
echo "📄 Phase 5: Removing flattened files..."
echo "--------------------------------------"
rm -rf flattened/
echo "✅ Removed flattened files"

# Phase 6: Clean up .DS_Store files
echo ""
echo "🗂️ Phase 6: Cleaning system files..."
echo "-----------------------------------"
find . -name ".DS_Store" -delete
echo "✅ Removed .DS_Store files"

# Phase 7: Clean cursor rules (manual review needed)
echo ""
echo "🎯 Phase 7: Cursor rules cleanup..."
echo "----------------------------------"
echo "⚠️ Manual review needed for .cursor/rules/"
echo "   - Remove redundant deployment guides"
echo "   - Consolidate similar rules"
echo "   - Keep essential rules only"

# Verify fresh ABIs exist
echo ""
echo "🔍 Verifying fresh ABIs..."
echo "-------------------------"
if [ -d "abis/frontend" ]; then
    echo "✅ Fresh ABIs found in abis/frontend/"
    ls -la abis/frontend/
else
    echo "❌ Fresh ABIs not found!"
    echo "Run: bun run  hardhat run scripts/generate-frontend-abis.ts"
    exit 1
fi

# Test build
echo ""
echo "🔨 Testing build process..."
echo "--------------------------"
bun run  clean
bun run  build
echo "✅ Build successful"

# Summary
echo ""
echo "🎉 Cleanup completed successfully!"
echo "=================================="
echo ""
echo "📊 Summary:"
echo "  - Old ABI files: REMOVED"
echo "  - Redundant configs: REMOVED"
echo "  - Duplicate docs: REMOVED"
echo "  - Analysis files: REMOVED"
echo "  - Flattened files: REMOVED"
echo "  - Fresh ABIs: READY in abis/frontend/"
echo ""
echo "📁 Fresh ABIs available in: abis/frontend/"
echo "🔗 Proxy addresses for frontend:"
echo "  -TigerStaking: 0x3681B95Ae5172D1Ba7A9f8E5092EBB112B027a4E"
echo "  -TigerRevenue: 0x08151D81F1bbbFD48B2CD2B729A2EAB0CE1BEAED"
echo "  - RewardDistributor: 0x21c6A4bB272eD8ba8889b1BD8af01A4a7eCd6C2C"
echo "  - TPT: 0x21c7941c0aB4b649685417C4aD2b2B28226343Df"
echo ""
echo "⚠️ Next steps:"
echo "  1. Review .cursor/rules/ for cleanup"
echo "  2. Test deployment scripts"
echo "  3. Update frontend integration"
echo "  4. Commit changes"
echo ""
echo "✅ Repository is now clean and production-ready!"
