# KAGE Staking System - Production Environment Configuration

## 🚀 Environment Variables for Production Deployment

This document provides all the required environment variables for deploying the KAGE staking system to production, using the deployed Sepolia contract addresses.

### 📋 Copy and Configure the Following Variables

Create a `.env` file in your project root and configure the following variables:

```bash
# KAGE Staking System - Environment Configuration
# ==================================================

# Network Configuration
# ----------------------
NODE_ENV=production
NETWORK=sepolia
CHAIN_ID=11155111

# RPC Configuration
# -----------------
# Sepolia Testnet
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Ethereum Mainnet (for production)
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
MAINNET_ALCHEMY_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Private Keys & Wallet Configuration
# -----------------------------------
# IMPORTANT: Never commit actual private keys to version control
DEPLOYER_PRIVATE_KEY=YOUR_DEPLOYER_PRIVATE_KEY_HERE
OWNER_PRIVATE_KEY=YOUR_OWNER_PRIVATE_KEY_HERE
TREASURY_PRIVATE_KEY=YOUR_TREASURY_PRIVATE_KEY_HERE

# Mnemonic for HD Wallet (alternative to private keys)
MNEMONIC="your twelve word mnemonic phrase here for deployment wallet"

# Contract Addresses - Sepolia Testnet
# ====================================
SEPOLIA_TIGERPALACE_TOKEN=0x21c7941c0aB4b649685417C4aD2b2B28226343Df
SEPOLIA_KAGEPOOL_PROXY=0x9d3fe2855A1593dA956F9b042644be78A9247ab0
SEPOLIA_KAGEPOOL_IMPLEMENTATION=0xdb06058784ED860228cDa12b0613F75ccdEc65F4
SEPOLIA_KAGEFLEXI_PROXY=0xFcfa9eAedFFc4E134F059487b770CccB1bE7AC95
SEPOLIA_KAGEFLEXI_IMPLEMENTATION=0xdb06058784ED860228cDa12b0613F75ccdEc65F4
SEPOLIA_REWARD_DISTRIBUTOR=0xAf88b4CB7Ce99D123Bc250614DaEec0BAd1Bcf84
SEPOLIA_KAGEUNIFIEDSTAKING=0x8baa78bFDB9A2d06F8ed05d6eCe9fE1dCa412D8E
SEPOLIA_KAGEREVENUE=0x43b3855529aEb3b170efF01E7422245417CcD5E9
SEPOLIA_PROXY_ADMIN=0xD6A8aC4131387c5fe8c071D886a61a96351AE0F3
SEPOLIA_TREASURY=0x55bE25f1cd1e34DaE4476DE2D005Da49dAdE707D

# Contract Addresses - Ethereum Mainnet (Update when deployed)
# ============================================================
MAINNET_TIGERPALACE_TOKEN=0x0000000000000000000000000000000000000000
MAINNET_KAGEPOOL_PROXY=0x0000000000000000000000000000000000000000
MAINNET_KAGEPOOL_IMPLEMENTATION=0x0000000000000000000000000000000000000000
MAINNET_KAGEFLEXI_PROXY=0x0000000000000000000000000000000000000000
MAINNET_KAGEFLEXI_IMPLEMENTATION=0x0000000000000000000000000000000000000000
MAINNET_REWARD_DISTRIBUTOR=0x0000000000000000000000000000000000000000
MAINNET_PROXY_ADMIN=0x0000000000000000000000000000000000000000
MAINNET_TREASURY=0x0000000000000000000000000000000000000000

# Dynamic Contract Selection (based on NETWORK variable)
# ======================================================
KAGE_TOKEN_ADDRESS=${NETWORK}_TIGERPALACE_TOKEN
KAGEPOOL_ADDRESS=${NETWORK}_KAGEPOOL_PROXY
KAGEFLEXI_ADDRESS=${NETWORK}_KAGEFLEXI_PROXY
REWARD_DISTRIBUTOR_ADDRESS=${NETWORK}_REWARD_DISTRIBUTOR
TREASURY_ADDRESS=${NETWORK}_TREASURY

# Pool Configuration
# ==================
DEFAULT_POOL_CAP=1000000000000000000000000  # 1M KAGE (in wei)
DEFAULT_MIN_STAKED=100000000000000000000     # 100 KAGE (in wei)
DEFAULT_LOCK_DURATION=2592000                # 30 days (in seconds)
DEFAULT_APY=1000                             # 10% apy (in basis points)
EARLY_WITHDRAWAL_FEE=3000                    # 30% penalty (in basis points)

# Token Configuration
# ===================
TOKEN_NAME="TIGERPALACE"
TOKEN_SYMBOL="KAGE"
TOKEN_DECIMALS=18
INITIAL_SUPPLY=1000000000000000000000000000  # 1B KAGE (in wei)

# Tax Configuration
# =================
BUY_TAX=500                                  # 5% (in basis points)
SELL_TAX=500                                 # 5% (in basis points)
MAX_WALLET_DIVISOR=100                       # 1% of total supply
MAX_TX_DIVISOR=100                          # 1% of total supply
MAX_SWAP_DIVISOR=1000                       # 0.1% of total supply

# Gas Configuration
# =================
GAS_LIMIT=6000000
GAS_PRICE=25000000000                        # 25 gwei (in wei)
MAX_FEE_PER_GAS=50000000000                 # 50 gwei (in wei)
MAX_PRIORITY_FEE_PER_GAS=2000000000         # 2 gwei (in wei)

# Etherscan API Configuration
# ===========================
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY_HERE
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY_HERE
BSCSCAN_API_KEY=YOUR_BSCSCAN_API_KEY_HERE

# Monitoring & Analytics
# ======================
ENABLE_MONITORING=true
PERFORMANCE_TRACKING=true
GAS_TRACKING=true
ERROR_REPORTING=true

# Security Configuration
# ======================
ENABLE_WHITELIST=false
ENABLE_BLACKLIST=false
ENABLE_PAUSE_CONTROLS=true
ENABLE_EMERGENCY_FUNCTIONS=true
TIMELOCK_DELAY=259200                        # 3 days (in seconds)

# Deployment Configuration
# ========================
VERIFY_CONTRACTS=true
OPTIMIZE_CONTRACTS=true
OPTIMIZATION_RUNS=200
COMPILER_VERSION=0.8.27
ENABLE_VIA_IR=false

# Database Configuration (if using)
# =================================
# DATABASE_URL=postgresql://user:password@localhost:5432/kage_staking
# REDIS_URL=redis://localhost:6379
# MONGODB_URL=mongodb://localhost:27017/kage_staking

# API Configuration
# =================
# API_PORT=3000
# API_HOST=localhost
# API_VERSION=v1
# JWT_SECRET=your_jwt_secret_here
# RATE_LIMIT=100

# Frontend Configuration
# ======================
FRONTEND_URL=https://stake.kagenetwork.io
BACKEND_URL=https://api.kagenetwork.io
ENABLE_CORS=true
ALLOWED_ORIGINS=https://stake.kagenetwork.io,https://www.kagenetwork.io,https://stake-flexi.vercel.app,https://flexi.kagenetwork.io

# Third-party Integrations
# ========================
COINGECKO_API_KEY=YOUR_COINGECKO_API_KEY
COINMARKETCAP_API_KEY=YOUR_COINMARKETCAP_API_KEY
DEXTOOLS_API_KEY=YOUR_DEXTOOLS_API_KEY

# Notification Configuration
# ==========================
ENABLE_NOTIFICATIONS=true
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK

# Backup & Recovery
# =================
BACKUP_ENABLED=true
BACKUP_FREQUENCY=daily
BACKUP_RETENTION=30
S3_BUCKET_NAME=kage-staking-backups
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
AWS_REGION=us-east-1

# Testing Configuration
# =====================
ENABLE_TESTING=true
TEST_NETWORK=hardhat
FORK_ENABLED=false
FORK_BLOCK_NUMBER=latest
COVERAGE_ENABLED=true

# Logging Configuration
# =====================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=logs/kage-staking.log
ENABLE_FILE_LOGGING=true
ENABLE_CONSOLE_LOGGING=true

# Performance Configuration
# =========================
CACHE_TTL=300                                # 5 minutes (in seconds)
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT=30000                        # 30 seconds (in milliseconds)
RETRY_ATTEMPTS=3
RETRY_DELAY=1000                            # 1 second (in milliseconds)

# Feature Flags
# =============
ENABLE_STAKING=true
ENABLE_UNSTAKING=true
ENABLE_EARLY_WITHDRAWAL=true
ENABLE_REVENUE_DISTRIBUTION=true
ENABLE_TIER_SYSTEM=true
ENABLE_PENALTY_SYSTEM=true
ENABLE_EMERGENCY_WITHDRAWAL=true

# Maintenance Mode
# ================
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE="System under maintenance. Please try again later."
MAINTENANCE_WHITELIST=0x1234567890123456789012345678901234567890

# Environment Validation
# ======================
REQUIRED_VARS=NODE_ENV,NETWORK,DEPLOYER_PRIVATE_KEY,SEPOLIA_RPC_URL
OPTIONAL_VARS=ENABLE_MONITORING,PERFORMANCE_TRACKING,GAS_TRACKING

# Development Only (Remove in production)
# =======================================
DEBUG=false
VERBOSE=false
SKIP_VALIDATIONS=false
MOCK_EXTERNAL_CALLS=false
```

## 🔧 Configuration Guide

### 1. Network Configuration

Set `NETWORK=sepolia` for testnet or `NETWORK=mainnet` for production.

### 2. RPC URLs

- Get Infura project ID from [infura.io](https://infura.io)
- Get Alchemy API key from [alchemy.com](https://www.alchemy.com)

### 3. Private Keys

⚠️ **Security Warning**: Never commit private keys to version control

- Use environment variables or secure key management services
- Consider using HD wallets with mnemonic phrases

### 4. Contract Addresses

Current Sepolia addresses are pre-filled. Update mainnet addresses when deploying to production.

### 5. Etherscan API

Get API keys from:

- [Etherscan](https://etherscan.io/apis)
- [Polygonscan](https://polygonscan.com/apis)
- [BscScan](https://bscscan.com/apis)

## 📝 Environment Files for Different Stages

### Development (.env.development)

```bash
NODE_ENV=development
NETWORK=hardhat
DEBUG=true
VERBOSE=true
SKIP_VALIDATIONS=true
```

### Testing (.env.test)

```bash
NODE_ENV=test
NETWORK=hardhat
ENABLE_TESTING=true
COVERAGE_ENABLED=true
MOCK_EXTERNAL_CALLS=true
```

### Staging (.env.staging)

```bash
NODE_ENV=staging
NETWORK=sepolia
ENABLE_MONITORING=true
PERFORMANCE_TRACKING=true
```

### Production (.env.production)

```bash
NODE_ENV=production
NETWORK=mainnet
ENABLE_MONITORING=true
PERFORMANCE_TRACKING=true
VERIFY_CONTRACTS=true
```

## 🛡️ Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use environment-specific files** - `.env.local`, `.env.production`
3. **Rotate keys regularly** - Especially for production
4. **Use secure key management** - AWS Secrets Manager, HashiCorp Vault
5. **Validate environment variables** - Check required variables on startup
6. **Use different keys per environment** - Separate dev/staging/prod

## 🚀 Quick Setup Commands

```bash
# Copy the configuration
cp PRODUCTION_ENV_CONFIG.md .env

# Edit with your values
nano .env

# Install dependencies
bun run  install

# Test configuration
bun run  hardhat run scripts/test-config.js

# Deploy to testnet
bun run  hardhat deploy --network sepolia

# Verify deployment
bun run  hardhat run scripts/verify-deployment.js --network sepolia
```

## 📊 Environment Validation Script

Create `scripts/validate-env.js`:

```javascript
const requiredVars = [
  "NODE_ENV",
  "NETWORK",
  "DEPLOYER_PRIVATE_KEY",
  "SEPOLIA_RPC_URL",
];

const optionalVars = [
  "ENABLE_MONITORING",
  "PERFORMANCE_TRACKING",
  "GAS_TRACKING",
];

function validateEnvironment() {
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
  }

  console.log("✅ All required environment variables are set");

  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  if (missingOptional.length > 0) {
    console.warn("⚠️ Missing optional environment variables:");
    missingOptional.forEach(varName => console.warn(`  - ${varName}`));
  }
}

validateEnvironment();
```

## 🔄 Dynamic Configuration

The environment supports dynamic contract selection based on the `NETWORK` variable:

```javascript
// Automatically selects the right contract address
const tokenAddress =
  process.env[`${process.env.NETWORK?.toUpperCase()}_TIGERPALACE_TOKEN`];
```

## 📋 Contract Address Reference

### Sepolia Testnet (Current)

- **TIGERPALACE Token**: `0x21c7941c0aB4b649685417C4aD2b2B28226343Df`
- **KagePool Proxy**: `0x9d3fe2855A1593dA956F9b042644be78A9247ab0`
- **KageFlexi Proxy**: `0xFcfa9eAedFFc4E134F059487b770CccB1bE7AC95`
- **RewardDistributor**: `0x6d4cEB3d417644f13c180600a90667FEA2B191B4`
- **Treasury**: `0x55bE25f1cd1e34DaE4476DE2D005Da49dAdE707D`

### Ethereum Mainnet (To be deployed)

Update these addresses when deploying to mainnet.

---

**🔒 Security Note**: Always review and validate environment variables before deployment. Never expose sensitive information in public repositories.
