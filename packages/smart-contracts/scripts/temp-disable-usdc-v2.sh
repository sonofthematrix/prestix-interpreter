#!/bin/bash
# Temporary script to move v2 contracts that require v1 dependencies
# This allows compilation to succeed while using MockUSDC or existing Sepolia USDC

echo "📦 Temporarily moving USDC v2 contracts (require missing v1 dependencies)..."

mkdir -p contracts/usdc/v2-disabled

# Move v2 contracts that depend on v1
mv contracts/usdc/v2/AbstractFiatTokenV2.sol contracts/usdc/v2-disabled/ 2>/dev/null || true
mv contracts/usdc/v2/FiatTokenV2.sol contracts/usdc/v2-disabled/ 2>/dev/null || true
mv contracts/usdc/v2/FiatTokenV2_1.sol contracts/usdc/v2-disabled/ 2>/dev/null || true
mv contracts/usdc/v2/FiatTokenV2_2.sol contracts/usdc/v2-disabled/ 2>/dev/null || true

echo "✅ Moved v2 contracts to v2-disabled/"
echo "💡 These contracts require Circle USDC v1 source code"
echo "💡 Use MockUSDC or existing Sepolia USDC instead"
echo ""
echo "To restore: mv contracts/usdc/v2-disabled/*.sol contracts/usdc/v2/"

