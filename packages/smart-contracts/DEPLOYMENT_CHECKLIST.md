# Smart Contract Deployment Checklist
## Tiger Palace Pro - Complete Deployment Guide

---

## ✅ Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Node.js v18+ installed
- [ ] Bun installed (`npm install -g bun`)
- [ ] MetaMask wallet configured with Sepolia testnet
- [ ] Sepolia ETH funded (get from faucet: https://sepolia portal.io/)
- [ ] Infura/Alchemy API key obtained

### 2. Environment Variables

Create `smart-contracts/.env`:

```bash
# Network Configuration
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Deployer Wallet (KEEP PRIVATE!)
PRIVATE_KEY=0x...your_private_key

# Etherscan (for verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Fee Configuration
FEE_RECIPIENT=0x584195f7298E14441D8B27b3c0fE5dDAcd5De4bD
MARKETPLACE_FEE_BPS=250

# Gas Configuration
GAS_PRICE_GWEI=20
GAS_LIMIT=8000000
```

Create root `.env`:

```bash
# === Database ===
DATABASE_URL=postgresql://user:pass@localhost:5432/tigerpalace

# === Blockchain RPC ===
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# === Contract Addresses (update after deployment) ===
RWA_ASSET_REGISTRY=
RWA_TOKEN_FACTORY=
RWA_MARKETPLACE=
MEMBERSHIP_SYSTEM=

# === Admin Configuration ===
ADMIN_WALLET_ADDRESS=0xA621B16E1c197a0774bFEa1701838F4E7c01b331

# === Feature Flags ===
ENABLE_BLOCKCHAIN_SYNC=true
ENABLE_AUTO_UPGRADE=false
```

### 3. Dependencies Installed
- [ ] `cd smart-contracts && bun install`
- [ ] `cd .. && pnpm install`

---

## 📝 Deployment Steps

### Step 1: Compile Contracts

```bash
cd smart-contracts
bun run compile
```

**Expected Output:**
```
Compiled 15 Solidity files successfully
✓ RWAAssetRegistry compiled
✓ RWAToken compiled
✓ RWATokenFactory compiled
✓ RWAMarketplace compiled
✓ MembershipSystem compiled
```

**Verify:**
- [ ] No compilation errors
- [ ] `artifacts/contracts/` directory created
- [ ] `typechain-types/` directory created

### Step 2: Run Tests (Optional but Recommended)

```bash
bun run test
```

**Verify:**
- [ ] All tests passing
- [ ] No gas estimation warnings

### Step 3: Deploy to Sepolia

```bash
bun run deploy:sepolia
```

**Expected Output:**
```
🚀 Deploying contracts to sepolia...
Deployer: 0xA621B16E1c197a0774bFEa1701838F4E7c01b331
✅ RWAAssetRegistry deployed: 0x...
✅ RWATokenFactory deployed: 0x...
✅ RWAMarketplace deployed: 0x...
🔐 Granted MARKETPLACE_ROLE to marketplace on registry
🔐 Granted TOKEN_CREATOR_ROLE to marketplace on factory
💸 Marketplace fee set to 250 bps
📝 Deployment addresses saved to deployments/sepolia.json
```

**Verify:**
- [ ] All 3 contracts deployed
- [ ] Roles granted successfully
- [ ] Deployment file created at `deployments/sepolia.json`

### Step 4: Verify Contracts on Etherscan

```bash
# Verify RWAAssetRegistry
bun run verify --network sepolia <RWA_ASSET_REGISTRY_ADDRESS>

# Verify RWATokenFactory
bun run verify --network sepolia <RWA_TOKEN_FACTORY_ADDRESS>

# Verify RWAMarketplace
bun run verify --network sepolia <RWA_MARKETPLACE_ADDRESS> <REGISTRY_ADDRESS> <FACTORY_ADDRESS> <FEE_RECIPIENT>
```

**Verify:**
- [ ] Contracts verified on Sepolia Etherscan
- [ ] Source code visible
- [ ] Read/Write functions accessible

### Step 5: Update Environment Variables

Copy addresses from `deployments/sepolia.json` to root `.env`:

```bash
# Update these in root .env
RWA_ASSET_REGISTRY=0x4db4f17e4e3a67bBD8c0cD3BE83072961703Ef07
RWA_TOKEN_FACTORY=0x07E9a4C59c7774b2700d8e3fe3424CD9fB85aa2E
RWA_MARKETPLACE=0x6e3bfae36b8eE8F0Ec2BA9C3CE6db1Bf61331BD0
```

**Verify:**
- [ ] Addresses copied correctly
- [ ] No typos
- [ ] Checksummed addresses (mixed case)

### Step 6: Initialize Database Schema

Update ZenStack schema with blockchain fields:

```typescript
// zenstack/schema-blockchain-extension.zmodel (already exists)

model Property {
  // ... existing fields
  
  // Blockchain Integration
  blockchainAssetId    String?   @unique
  tokenAddress         String?
  syncStatus           SyncStatus @default(PENDING)
  lastSyncedAt         DateTime?
  blockchainTxHash     String?
}

model TokenizedAsset {
  id                String              @id @default(cuid())
  tokenAddress      String              @unique
  assetId           String              
  name              String
  symbol            String
  totalSupply       String
  network           BlockchainNetwork
  chainId           Int
  contractType      ContractType
  dataStorage       DataStorageType     @default(HYBRID)
  syncStatus        SyncStatus          @default(SYNCED)
  lastSyncedAt      DateTime            @default(now())
  blockchainTxHash  String
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}
```

Run migrations:

```bash
pnpm zen:generate
pnpm db:push
```

**Verify:**
- [ ] Schema generated successfully
- [ ] Database updated
- [ ] New tables created

### Step 7: Start Blockchain Sync Worker

```bash
pnpm blockchain:sync:dev
```

**Expected Output:**
```
🚀 Starting blockchain synchronization worker...
✅ Event listeners started
✅ Worker started and listening for events
```

**Verify:**
- [ ] Worker running without errors
- [ ] Connected to RPC provider
- [ ] Event listeners active

### Step 8: Test Deployment

Create test script `scripts/test-deployment.ts`:

```typescript
import { ethers } from 'ethers';

async function testDeployment() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  
  // Test RWAAssetRegistry
  const registryAddress = process.env.RWA_ASSET_REGISTRY;
  const code = await provider.getCode(registryAddress);
  
  if (code === '0x') {
    throw new Error('Registry not deployed');
  }
  
  console.log('✅ RWAAssetRegistry deployed and verified');
  
  // Test connection
  const blockNumber = await provider.getBlockNumber();
  console.log(`✅ Connected to Sepolia at block: ${blockNumber}`);
  
  console.log('\n✅ All deployment tests passed!');
}

testDeployment().catch(console.error);
```

Run test:

```bash
tsx scripts/test-deployment.ts
```

**Verify:**
- [ ] All contracts accessible
- [ ] RPC connection working
- [ ] Block number updates

---

## 🔧 Post-Deployment Configuration

### 1. Grant Additional Roles

Create `scripts/grant-roles.ts`:

```typescript
import hre from "hardhat";
const { ethers } = hre;

async function grantRoles() {
  const [deployer] = await ethers.getSigners();
  
  const registryAddress = process.env.RWA_ASSET_REGISTRY;
  const factoryAddress = process.env.RWA_TOKEN_FACTORY;
  
  const registry = await ethers.getContractAt("RWAAssetRegistry", registryAddress);
  const factory = await ethers.getContractAt("RWATokenFactory", factoryAddress);
  
  // Grant ASSET_MANAGER_ROLE to backend wallet
  const backendWallet = process.env.BACKEND_WALLET_ADDRESS;
  if (backendWallet) {
    const ASSET_MANAGER_ROLE = await registry.ASSET_MANAGER_ROLE();
    await registry.grantRole(ASSET_MANAGER_ROLE, backendWallet);
    console.log(`✅ Granted ASSET_MANAGER_ROLE to ${backendWallet}`);
  }
  
  // Grant TOKEN_CREATOR_ROLE to backend wallet
  if (backendWallet) {
    const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
    await factory.grantRole(TOKEN_CREATOR_ROLE, backendWallet);
    console.log(`✅ Granted TOKEN_CREATOR_ROLE to ${backendWallet}`);
  }
  
  console.log('✅ All roles granted');
}

grantRoles().catch(console.error);
```

Run:

```bash
cd smart-contracts
tsx scripts/grant-roles.ts
```

**Verify:**
- [ ] Roles granted successfully
- [ ] Backend wallet can interact with contracts

### 2. Configure Fee Settings

```typescript
// scripts/configure-fees.ts

import hre from "hardhat";
const { ethers } = hre;

async function configureFees() {
  const marketplaceAddress = process.env.RWA_MARKETPLACE;
  const marketplace = await ethers.getContractAt("RWAMarketplace", marketplaceAddress);
  
  // Set marketplace fee (2.5% = 250 basis points)
  await marketplace.setMarketplaceFee(250);
  console.log('✅ Marketplace fee set to 2.5%');
  
  // Set fee recipient
  const feeRecipient = process.env.FEE_RECIPIENT;
  await marketplace.setFeeRecipient(feeRecipient);
  console.log(`✅ Fee recipient set to ${feeRecipient}`);
}

configureFees().catch(console.error);
```

**Verify:**
- [ ] Fees configured correctly
- [ ] Fee recipient address set

### 3. Initialize Membership Tiers

If MembershipSystem is deployed:

```typescript
// scripts/init-membership.ts

async function initMembership() {
  const membershipAddress = process.env.MEMBERSHIP_SYSTEM;
  const membership = await ethers.getContractAt("MembershipSystem", membershipAddress);
  
  // Verify tier requirements
  const bronzeReq = await membership.getTierRequirement(1); // BRONZE
  const silverReq = await membership.getTierRequirement(2); // SILVER
  const goldReq = await membership.getTierRequirement(3);   // GOLD
  
  console.log('Tier Requirements:');
  console.log(`- BRONZE: ${ethers.formatEther(bronzeReq)} ETH`);
  console.log(`- SILVER: ${ethers.formatEther(silverReq)} ETH`);
  console.log(`- GOLD: ${ethers.formatEther(goldReq)} ETH`);
  
  console.log('✅ Membership system initialized');
}

initMembership().catch(console.error);
```

**Verify:**
- [ ] Membership tiers configured
- [ ] Benefits correctly set

---

## 🧪 Testing & Validation

### 1. Test Asset Registration

```bash
curl -X POST http://localhost:3000/api/blockchain/register-asset \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "title": "Luxury Condo - Test",
    "description": "Test asset for deployment validation",
    "assetType": "RESIDENTIAL",
    "location": "Miami, FL",
    "price": "1.0",
    "tokenPrice": "0.01",
    "totalTokens": "100"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "assetId": "1",
    "txHash": "0x...",
    "property": { ... }
  }
}
```

**Verify:**
- [ ] Asset registered on blockchain
- [ ] Transaction confirmed
- [ ] Database record created
- [ ] Event listener captured event

### 2. Test Token Creation

```bash
curl -X POST http://localhost:3000/api/blockchain/create-token \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "assetId": "1",
    "name": "Luxury Condo Token",
    "symbol": "LCT",
    "totalSupply": "100"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tokenAddress": "0x...",
    "txHash": "0x...",
    "tokenizedAsset": { ... }
  }
}
```

**Verify:**
- [ ] Token contract deployed
- [ ] Token address returned
- [ ] Database record created

### 3. Test Blockchain Query

```bash
curl http://localhost:3000/api/blockchain/asset/1 \
  -H "Cookie: your-session-cookie"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "owner": "0x...",
    "title": "Luxury Condo - Test",
    ...
  }
}
```

**Verify:**
- [ ] Asset data retrieved from blockchain
- [ ] Data matches registered asset
- [ ] No errors

### 4. Health Check

```bash
curl http://localhost:3000/api/blockchain/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "network": "sepolia",
  "chainId": 11155111,
  "blockNumber": 12345678,
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

**Verify:**
- [ ] System healthy
- [ ] Correct network
- [ ] Block number updating

---

## 📊 Monitoring & Maintenance

### 1. Setup Monitoring

Create `scripts/monitor-blockchain.ts`:

```typescript
import { getBlockchainService } from '@/lib/services/blockchain-service';

async function monitor() {
  const blockchain = getBlockchainService();
  const provider = blockchain['provider'];
  
  setInterval(async () => {
    const blockNumber = await provider.getBlockNumber();
    const balance = await provider.getBalance(process.env.ADMIN_WALLET_ADDRESS);
    
    console.log(`[${new Date().toISOString()}]`);
    console.log(`Block: ${blockNumber}`);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    console.log('---');
  }, 60000); // Every minute
}

monitor().catch(console.error);
```

**Run:**
```bash
pnpm blockchain:monitor
```

### 2. Log Monitoring

```bash
# View sync worker logs
tail -f logs/blockchain-sync.log

# View API logs
tail -f logs/api.log
```

### 3. Database Sync Status

```sql
-- Check sync status
SELECT 
  COUNT(*) as total_properties,
  COUNT(CASE WHEN blockchainAssetId IS NOT NULL THEN 1 END) as synced_properties,
  COUNT(CASE WHEN syncStatus = 'PENDING' THEN 1 END) as pending_sync
FROM Property;
```

---

## 🚨 Troubleshooting

### Issue: Deployment Fails

**Solution:**
1. Check wallet balance (need >0.1 ETH for Sepolia)
2. Verify PRIVATE_KEY in `.env`
3. Check RPC URL is correct
4. Increase gas price if network congested

### Issue: Event Listener Not Working

**Solution:**
1. Restart sync worker
2. Check RPC connection
3. Verify contract addresses in `.env`
4. Check event listener code for errors

### Issue: Transaction Reverts

**Solution:**
1. Check gas limit
2. Verify contract permissions
3. Check input validation
4. Review transaction logs on Etherscan

### Issue: Sync Worker Crashes

**Solution:**
1. Check PostgreSQL connection
2. Verify ZenStack schema
3. Review error logs
4. Restart with clean state

---

## ✅ Deployment Complete Checklist

- [ ] All contracts compiled
- [ ] Contracts deployed to Sepolia
- [ ] Contracts verified on Etherscan
- [ ] Environment variables updated
- [ ] **Frontend ABI alignment verified** (run `bun run scripts/verify-frontend-abi-alignment.ts`)
- [ ] Contract store addresses updated
- [ ] ABI JSON files updated with NEW addresses
- [ ] Wallet pages verified (no hardcoded addresses)
- [ ] Database schema migrated
- [ ] Sync worker running
- [ ] API endpoints tested
- [ ] Frontend integration working
- [ ] Monitoring setup
- [ ] Documentation updated

---

## 📚 Next Steps

1. **Security Audit**: Get contracts audited before mainnet
2. **Load Testing**: Test with multiple concurrent users
3. **Gas Optimization**: Optimize contract gas usage
4. **Mainnet Deployment**: Deploy to Ethereum mainnet
5. **User Onboarding**: Create user documentation

---

## 🆘 Support

For issues:
1. Check logs: `logs/blockchain-sync.log`
2. View transactions: https://sepolia.etherscan.io
3. Test RPC: `curl $SEPOLIA_RPC_URL`
4. Review documentation: `COMPREHENSIVE_INTEGRATION_GUIDE.md`

---

**Deployment Date:** _____________________
**Deployed By:** _____________________
**Network:** Sepolia Testnet
**Status:** ☐ Complete ☐ In Progress ☐ Pending

