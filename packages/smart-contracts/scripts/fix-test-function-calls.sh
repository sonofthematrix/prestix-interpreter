#!/bin/bash

# Script to fix common function call patterns in test files

echo "🔧 Fixing test function calls..."

# Find all test files
find test -name "*.spec.ts" -type f | while read file; do
  echo "Processing: $file"
  
  # Replace function calls
  sed -i '' \
    -e 's/\.createUserStake(/\.stake(/g' \
    -e 's/\.userWithdraw(/\.claimRewards(/g' \
    -e 's/\.kageCreatePool(/\.createPool(/g' \
    -e 's/\.rwaCreatePool(/\.createPool(/g' \
    -e 's/\.rwaPause(/\.pause(/g' \
    -e 's/\.rwaUnpause(/\.unpause(/g' \
    -e 's/\.setExcludedFromFee(/\.setTaxExemption(/g' \
    -e 's/\.kagePoolLength(/\.getStats(/g' \
    -e 's/\.kagePoolInfo(/\.getPool(/g' \
    -e 's/\.rwaPoolInfo(/\.getPool(/g' \
    -e 's/\.kageTotalStaked(/\.totalStaked(/g' \
    -e 's/\.rwaTotalStaked(/\.totalStaked(/g' \
    "$file"
done

echo "✅ Function call replacements complete!"
echo ""
echo "⚠️  Manual review still needed for:"
echo "  - Constructor signatures"
echo "  - Function parameter adjustments"
echo "  - Tests for removed functionality (tiers, etc.)"
