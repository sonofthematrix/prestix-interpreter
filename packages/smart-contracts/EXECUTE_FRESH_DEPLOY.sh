#!/bin/bash
###############################################################################
# COMPLETE FRESH ECOSYSTEM DEPLOYMENT - EXECUTION SCRIPT
#
# This script guides you through the complete fresh deployment process:
# 1. Cleanup all previous deployments
# 2. Deploy fresh ecosystem with latest contracts
# 3. Verify everything is working
#
# Usage:
#   cd packages/smart-contracts
#   chmod +x EXECUTE_FRESH_DEPLOY.sh
#   ./EXECUTE_FRESH_DEPLOY.sh
###############################################################################

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   COMPLETE FRESH ECOSYSTEM DEPLOYMENT                      ║${NC}"
echo -e "${BLUE}║   Automated Execution Script                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check we're in the right directory
if [ ! -f "hardhat.config.ts" ]; then
    echo -e "${RED}❌ Error: hardhat.config.ts not found${NC}"
    echo -e "${RED}   Please run this script from packages/smart-contracts directory${NC}"
    exit 1
fi

# Load environment variables from .env.local
echo -e "${YELLOW}📄 Loading environment variables from .env.local...${NC}"
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env.local file not found${NC}"
    exit 1
fi
echo ""

# Check environment variables
echo -e "${YELLOW}🔍 Checking environment variables...${NC}"
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}❌ SEPOLIA_RPC_URL not set${NC}"
    exit 1
else
    echo -e "${GREEN}✓ SEPOLIA_RPC_URL found${NC}"
fi
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ PRIVATE_KEY not set${NC}"
    exit 1
else
    echo -e "${GREEN}✓ PRIVATE_KEY found${NC}"
fi
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    exit 1
else
    echo -e "${GREEN}✓ DATABASE_URL found${NC}"
fi
if [ -z "$ETHERSCAN_API_KEY" ] && [ -z "$NEXT_PUBLIC_ETHERSCAN_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  WARNING: ETHERSCAN_API_KEY not set - contract verification will be skipped${NC}"
else
    echo -e "${GREEN}✓ ETHERSCAN_API_KEY found${NC}"
fi
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All required environment variables are set${NC}"
echo ""

###############################################################################
# STEP 1: CLEANUP
###############################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   STEP 1: Complete Cleanup                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  This will DELETE:${NC}"
echo -e "   • All build artifacts (artifacts/, cache/, .openzeppelin/)"
echo -e "   • All deployment records (deployed-addresses*.json)"
echo -e "   • All database records for Sepolia network"
echo ""
echo -e "${YELLOW}📋 Target Network: Sepolia (Chain ID: 11155111)${NC}"
echo ""
echo -e "${YELLOW}Do you want to proceed with cleanup? (yes/no)${NC}"
read -r CONFIRM_CLEANUP

if [ "$CONFIRM_CLEANUP" != "yes" ]; then
    echo -e "${RED}❌ Cleanup cancelled by user${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🧹 Starting cleanup...${NC}"
bun run tsx scripts/complete-cleanup.ts

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cleanup failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Cleanup completed successfully${NC}"
echo ""

###############################################################################
# STEP 2: MANUAL ENV CHECK
###############################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   STEP 2: Environment Variables Cleanup (Manual)           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📝 Please review your .env.local file and remove/comment out:${NC}"
echo -e "   - NEXT_PUBLIC_RWA_ASSET_REGISTRY"
echo -e "   - NEXT_PUBLIC_RWA_TOKEN_FACTORY"
echo -e "   - NEXT_PUBLIC_RWA_TOKEN_FACTORY_404"
echo -e "   - NEXT_PUBLIC_RWA_MARKETPLACE"
echo -e "   - NEXT_PUBLIC_RWA_MARKETPLACE_SETTER"
echo -e "   - PROXY_ADMIN_ADDRESS"
echo ""
echo -e "${YELLOW}Have you cleaned up the .env.local file? (yes/no)${NC}"
read -r CONFIRM_ENV

if [ "$CONFIRM_ENV" != "yes" ]; then
    echo -e "${RED}❌ Deployment cancelled - please clean up .env.local first${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Environment variables cleaned up${NC}"
echo ""

###############################################################################
# STEP 3: FRESH DEPLOYMENT
###############################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   STEP 3: Fresh Ecosystem Deployment                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🚀 Starting fresh deployment...${NC}"
echo -e "   This will deploy:"
echo -e "   • RWAAssetRegistryUpgradeable (UUPS Proxy)"
echo -e "   • RWATokenFactoryUpgradeable (UUPS Proxy)"
echo -e "   • RWATokenFactory404Fixed (Direct)"
echo -e "   • RWAMarketplaceUpgradeableSetter (UUPS Proxy)"
echo ""
echo -e "${YELLOW}⏳ This may take 5-10 minutes...${NC}"
echo ""

bun run tsx scripts/deploy-complete-fresh-ecosystem.ts

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment completed successfully${NC}"
echo ""

###############################################################################
# STEP 4: VERIFICATION
###############################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   STEP 4: Post-Deployment Verification                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if deployment summary exists
if [ -f "deployment-summary-fresh.json" ]; then
    echo -e "${GREEN}✅ Deployment summary found${NC}"
    echo ""
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    cat deployment-summary-fresh.json | grep -E '(proxy|address|implementation)' | head -20
    echo ""
else
    echo -e "${YELLOW}⚠️  Deployment summary not found${NC}"
fi

# Verify database records
echo -e "${GREEN}🔍 Verifying database records...${NC}"
echo ""

# Count deployed contracts in database
echo -e "SELECT COUNT(*) as contract_count FROM deployed_contracts WHERE network_id = '11155111';" | psql $DATABASE_URL -t || true
echo ""

###############################################################################
# STEP 5: UPDATE ENV VARIABLES
###############################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   STEP 5: Update Environment Variables                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -f "deployment-summary-fresh.json" ]; then
    echo -e "${YELLOW}📝 Add these to your .env.local file:${NC}"
    echo ""
    
    REGISTRY_PROXY=$(cat deployment-summary-fresh.json | grep -o '"proxy": *"[^"]*"' | head -1 | sed 's/"proxy": *"\(.*\)"/\1/')
    FACTORY_PROXY=$(cat deployment-summary-fresh.json | grep -o '"proxy": *"[^"]*"' | sed -n '2p' | sed 's/"proxy": *"\(.*\)"/\1/')
    FACTORY404=$(cat deployment-summary-fresh.json | grep -o '"address": *"[^"]*"' | head -1 | sed 's/"address": *"\(.*\)"/\1/')
    MARKETPLACE_PROXY=$(cat deployment-summary-fresh.json | grep -o '"proxy": *"[^"]*"' | sed -n '3p' | sed 's/"proxy": *"\(.*\)"/\1/')
    
    echo -e "NEXT_PUBLIC_RWA_ASSET_REGISTRY=${REGISTRY_PROXY}"
    echo -e "NEXT_PUBLIC_RWA_TOKEN_FACTORY=${FACTORY_PROXY}"
    echo -e "NEXT_PUBLIC_RWA_TOKEN_FACTORY_404=${FACTORY404}"
    echo -e "NEXT_PUBLIC_RWA_MARKETPLACE=${MARKETPLACE_PROXY}"
    echo ""
fi

###############################################################################
# COMPLETION
###############################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ✅ FRESH ECOSYSTEM DEPLOYMENT COMPLETE!                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🎉 Your fresh RWA marketplace ecosystem is ready!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Update .env.local with new contract addresses (see above)"
echo -e "   2. Register properties in the registry"
echo -e "   3. Deploy ERC404 tokens for properties"
echo -e "   4. Create marketplace listings"
echo -e "   5. Test purchase flow"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "   • Full Guide: ${BLUE}FRESH_DEPLOYMENT_GUIDE.md${NC}"
echo -e "   • Summary: ${BLUE}deployment-summary-fresh.json${NC}"
echo ""
echo -e "${GREEN}✅ All done! Happy deploying! 🚀${NC}"
