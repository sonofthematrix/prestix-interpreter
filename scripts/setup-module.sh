#!/bin/bash
set -euo pipefail

echo "🚀 PRESTIX.VIP AppKit SIWE Auth Module Setup Script"
echo "==================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v bun &> /dev/null && ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js or Bun not found. Please install one.${NC}"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git not found. Please install git.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Prerequisites met${NC}"
echo ""

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
  echo "   Using Bun..."
  bun install
else
  echo "   Using npm..."
  npm install
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Environment setup
echo "⚙️  Setting up environment..."
if [ ! -f .env.local ]; then
  echo "   Creating .env.local..."
  if [ -f .env.example ]; then
    cp .env.example .env.local
  else
    touch .env.local
  fi

  # Generate NEXTAUTH_SECRET if openssl is available
  if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -base64 32)
    # Try to update NEXTAUTH_SECRET if it exists in .env.local
    if grep -q "NEXTAUTH_SECRET" .env.local; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$SECRET/" .env.local
      else
        sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$SECRET/" .env.local
      fi
    else
      echo "NEXTAUTH_SECRET=$SECRET" >> .env.local
    fi
  fi

  echo -e "${YELLOW}⚠️  Please update .env.local with:${NC}"
  echo "   - NEXTAUTH_URL (should match your domain)"
  echo "   - NEXT_PUBLIC_REOWN_PROJECT_ID (from dashboard.reown.com)"
  echo "   - DATABASE_URL (PostgreSQL connection string)"
else
  echo "   .env.local already exists, skipping..."
fi
echo -e "${GREEN}✅ Environment configured${NC}"
echo ""

# Step 4: Database setup
echo "🗄️  Setting up database..."
read -p "Create database schema now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "   Generating ZenStack schema..."
  if command -v bun &> /dev/null; then
    bun run zen:generate
  else
    npx zen generate
  fi
  
  echo "   Pushing schema to database..."
  if command -v bun &> /dev/null; then
    bun run db:push
  else
    npx zen db push dev --accept-data-loss
  fi
  echo -e "${GREEN}✅ Database schema created${NC}"
else
  echo "   Skipping database setup..."
fi
echo ""

# Step 5: Verify setup
echo "✨ Verifying setup..."
echo ""

if [ -f .env.local ]; then
  echo -e "${GREEN}✅ .env.local exists${NC}"
else
  echo -e "${RED}❌ .env.local not found${NC}"
fi

if [ -d node_modules ]; then
  echo -e "${GREEN}✅ Dependencies installed${NC}"
else
  echo -e "${RED}❌ node_modules not found${NC}"
fi

if [ -f next.config.js ] || [ -f next.config.mjs ] || [ -f next.config.ts ]; then
  echo -e "${GREEN}✅ Next.js configured${NC}"
else
  echo -e "${RED}❌ next.config.* not found${NC}"
fi

if [ -f zenstack/schema.zmodel ]; then
  echo -e "${GREEN}✅ ZenStack schema found${NC}"
else
  echo -e "${YELLOW}⚠️  zenstack/schema.zmodel not found${NC}"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env.local with your configuration"
echo "  2. Ensure database is running and DATABASE_URL is correct"
echo "  3. Run: bun run dev"
echo "  4. Open: http://localhost:3000"
echo ""
echo "Need help? See README.md or SETUP_GUIDE.md"
