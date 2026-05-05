import hre from "hardhat";
const { ethers, network } = hre;
import type { ContractTransactionResponse } from "ethers";

async function main() {
  console.log(`\n🚀 Redeploying RWAAssetRegistry with fixes to ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient balance for deployment");
  }

  // 1) Deploy new RWAAssetRegistry with fixes
  console.log(`\n1️⃣ Deploying RWAAssetRegistry with status corruption fixes...`);
  const Registry = await ethers.getContractFactory("RWAAssetRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`✅ RWAAssetRegistry deployed: ${registryAddress}`);

  // 2) Verify contract functionality
  console.log(`\n2️⃣ Verifying contract functionality...`);

  // Test basic functionality
  const nextAssetId = await registry.getNextAssetId();
  console.log(`✅ Next Asset ID: ${nextAssetId}`);

  // Test role setup
  const hasAssetManagerRole = await registry.hasRole(await registry.ASSET_MANAGER_ROLE(), deployer.address);
  console.log(`✅ Deployer has ASSET_MANAGER_ROLE: ${hasAssetManagerRole}`);

  const hasDefaultAdminRole = await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log(`✅ Deployer has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);

  // 3) Grant roles to marketplace (if marketplace exists)
  const marketplaceAddress = process.env.NEXT_PUBLIC_RWA_MARKETPLACE;
  if (marketplaceAddress) {
    console.log(`\n3️⃣ Granting MARKETPLACE_ROLE to existing marketplace...`);

    try {
      // First check if marketplace contract exists
      const code = await ethers.provider.getCode(marketplaceAddress);
      if (code === '0x') {
        console.log(`⚠️ Marketplace contract not found at ${marketplaceAddress}`);
      } else {
        // Grant MARKETPLACE_ROLE
        const marketplaceRole = await registry.grantRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress);
        await marketplaceRole.wait();
        console.log(`✅ Granted MARKETPLACE_ROLE to marketplace: ${marketplaceAddress}`);

        // Grant ASSET_MANAGER_ROLE to marketplace for status updates
        const assetManagerRole = await registry.grantRole(await registry.ASSET_MANAGER_ROLE(), marketplaceAddress);
        await assetManagerRole.wait();
        console.log(`✅ Granted ASSET_MANAGER_ROLE to marketplace: ${marketplaceAddress}`);
      }
    } catch (error: any) {
      console.log(`⚠️ Error granting roles to marketplace: ${error.message}`);
    }
  } else {
    console.log(`\n3️⃣ No marketplace address found in environment - skipping role grants`);
  }

  // 4) Generate deployment summary
  console.log(`\n4️⃣ Deployment Summary:`);
  console.log(`==============================`);
  console.log(`Network: ${network.name}`);
  console.log(`RWAAssetRegistry: ${registryAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Block: ${await ethers.provider.getBlockNumber()}`);
  console.log(`==============================`);

  // 5) Environment update instructions
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Update environment variables:`);
  console.log(`   NEXT_PUBLIC_RWA_ASSET_REGISTRY=${registryAddress}`);
  console.log(`2. Update marketplace contract to use new registry`);
  console.log(`3. Test createListing functionality`);
  console.log(`4. Run: bun run scripts/verify-frontend-abi-alignment.ts`);

  console.log(`\n🎉 RWAAssetRegistry redeployed successfully with fixes!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
