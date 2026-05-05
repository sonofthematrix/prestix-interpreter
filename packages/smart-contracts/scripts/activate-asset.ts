import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
const rootEnvLocalPath = path.join(__dirname, "../../../.env.local");
const rootEnvPath = path.join(__dirname, "../../../.env");
const localEnvLocalPath = path.join(__dirname, "../.env.local");
const localEnvPath = path.join(__dirname, "../.env");

if (fs.existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvLocalPath)) {
  dotenv.config({ path: localEnvLocalPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xA1fb017a8c89cCB76F63d2244C4a228964B50D80';

const REGISTRY_ABI = [
  'function getAsset(uint256) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
  'function updateAssetStatus(uint256 assetId, uint8 newStatus)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function ASSET_MANAGER_ROLE() view returns (bytes32)',
] as const;

async function main() {
  const assetIdStr = process.env.ASSET_ID;
  const newStatusStr = process.env.STATUS || '1'; // Default to ACTIVE (1)

  if (!assetIdStr) {
    console.log('❌ Usage: ASSET_ID=<id> [STATUS=<0|1|2|3>] bun hardhat run scripts/activate-asset.ts --network sepolia\n');
    console.log('   STATUS: 0=PENDING, 1=ACTIVE, 2=SOLD_OUT, 3=INACTIVE\n');
    process.exit(1);
  }

  const assetId = parseInt(assetIdStr);
  const newStatus = parseInt(newStatusStr);

  const adminAddress = process.env.ADMIN_WALLET || process.env.ADMIN_WALLET_ADDRESS;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY;

  if (!adminAddress || !adminPrivateKey) {
    console.log('❌ Admin wallet not found\n');
    process.exit(1);
  }

  const provider = ethers.provider;
  const adminSigner = new ethers.Wallet(adminPrivateKey, provider);
  const registry = await ethers.getContractAt(REGISTRY_ABI as any, REGISTRY_ADDRESS);

  const ASSET_MANAGER_ROLE = await registry.ASSET_MANAGER_ROLE();
  const hasRole = await registry.hasRole(ASSET_MANAGER_ROLE, adminSigner.address);
  
  if (!hasRole) {
    console.log(`❌ Admin does not have ASSET_MANAGER_ROLE\n`);
    process.exit(1);
  }

  const asset = await registry.getAsset(assetId);
  console.log(`Asset ${assetId}: ${asset.title}`);
  console.log(`Current Status: ${asset.status}\n`);

  const registryWithSigner = registry.connect(adminSigner);
  const tx = await (registryWithSigner as any).updateAssetStatus(assetId, newStatus);
  await tx.wait();

  console.log(`✅ Asset ${assetId} status updated to ${newStatus}\n`);
}

main().catch(console.error);

