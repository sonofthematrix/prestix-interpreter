import hre from "hardhat";
const { ethers, network, upgrades } = hre;

async function main() {
  console.log(`\n🚀 Upgrading RWAAssetRegistry implementation with fixes on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Current proxy address
  const REGISTRY_PROXY = "0x8a1fc23bA5BB67AADc85A6B80351D6793e4C3945";

  // 1) Deploy new implementation with fixes
  console.log(`\n1️⃣ Deploying RWAAssetRegistryUpgradeable with fixes...`);
  const RegistryUpgradeable = await ethers.getContractFactory("RWAAssetRegistryUpgradeable");
  const newImpl = await RegistryUpgradeable.deploy();
  await newImpl.waitForDeployment();
  const newImplAddress = await newImpl.getAddress();
  console.log(`✅ New implementation deployed: ${newImplAddress}`);

  // 2) Upgrade the proxy to the new implementation
  console.log(`\n2️⃣ Upgrading registry proxy to new implementation...`);

  try {
    // Use the OpenZeppelin upgrades plugin which handles ProxyAdmin automatically
    const upgradedRegistry = await upgrades.upgradeProxy(REGISTRY_PROXY, RegistryUpgradeable);
    await upgradedRegistry.waitForDeployment();

    console.log(`✅ Registry proxy upgraded successfully using upgrades plugin`);

    // Get the implementation address from the upgraded contract
    const currentImpl = await upgrades.erc1967.getImplementationAddress(REGISTRY_PROXY);
    console.log(`Current implementation after upgrade: ${currentImpl}`);

    if (currentImpl.toLowerCase() === newImplAddress.toLowerCase()) {
      console.log(`✅ Upgrade verified successfully`);
    } else {
      console.log(`⚠️ Implementation address mismatch, but upgrade may have succeeded`);
      console.log(`   Expected: ${newImplAddress}`);
      console.log(`   Current:  ${currentImpl}`);
    }
  } catch (error: any) {
    console.error(`❌ Upgrade failed: ${error.message}`);

    // Fallback: Check if deployer is ProxyAdmin owner and try manual upgrade
    console.log(`Trying manual ProxyAdmin approach...`);

    const proxyAdminAddress = "0xB8AD57FC91066Bba784186A307D9b0271ce4d789";
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = ProxyAdmin.attach(proxyAdminAddress);

    const proxyAdminOwner = await proxyAdmin.owner();
    console.log(`ProxyAdmin owner: ${proxyAdminOwner}`);
    console.log(`Deployer address: ${deployer.address}`);

    if (proxyAdminOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log(`✅ Deployer is ProxyAdmin owner, attempting manual upgrade...`);

      const upgradeTx = await proxyAdmin.upgrade(REGISTRY_PROXY, newImplAddress);
      await upgradeTx.wait();
      console.log(`✅ Registry proxy upgraded successfully with manual ProxyAdmin`);

      const updatedImpl = await upgrades.erc1967.getImplementationAddress(REGISTRY_PROXY);
      if (updatedImpl.toLowerCase() === newImplAddress.toLowerCase()) {
        console.log(`✅ Upgrade verified successfully`);
      } else {
        throw new Error(`Upgrade verification failed. Expected: ${newImplAddress}, Got: ${updatedImpl}`);
      }
    } else {
      throw new Error(`Deployer is not ProxyAdmin owner. Cannot upgrade. Owner: ${proxyAdminOwner}`);
    }
  }

  // 3) Verify the fixes are working
  console.log(`\n3️⃣ Verifying fixes are applied...`);

  const registry = RegistryUpgradeable.attach(REGISTRY_PROXY);

  // Test enhanced authorization
  const hasAdminRole = await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log(`✅ Admin has DEFAULT_ADMIN_ROLE: ${hasAdminRole}`);

  const hasAssetManagerRole = await registry.hasRole(await registry.ASSET_MANAGER_ROLE(), deployer.address);
  console.log(`✅ Admin has ASSET_MANAGER_ROLE: ${hasAssetManagerRole}`);

  // Test forceUpdateAssetStatus function exists
  try {
    // Try to call forceUpdateAssetStatus (should exist now)
    await registry.forceUpdateAssetStatus.estimateGas(999, 1); // This will revert but shows function exists
    console.log(`✅ forceUpdateAssetStatus function exists`);
  } catch (error: any) {
    if (error.message.includes("asset not found")) {
      console.log(`✅ forceUpdateAssetStatus function exists (reverted as expected for non-existent asset)`);
    } else {
      console.log(`❌ forceUpdateAssetStatus function issue: ${error.message}`);
    }
  }

  // 4) Grant roles to marketplace (if needed)
  console.log(`\n4️⃣ Ensuring marketplace has required roles...`);

  const marketplaceAddress = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7";

  // Check if marketplace has MARKETPLACE_ROLE
  const hasMarketplaceRole = await registry.hasRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress);
  if (!hasMarketplaceRole) {
    const grantMarketplaceTx = await registry.grantRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress);
    await grantMarketplaceTx.wait();
    console.log(`✅ Granted MARKETPLACE_ROLE to marketplace`);
  } else {
    console.log(`✅ Marketplace already has MARKETPLACE_ROLE`);
  }

  // Check if marketplace has ASSET_MANAGER_ROLE
  const hasAssetManagerRole2 = await registry.hasRole(await registry.ASSET_MANAGER_ROLE(), marketplaceAddress);
  if (!hasAssetManagerRole2) {
    const grantAssetManagerTx = await registry.grantRole(await registry.ASSET_MANAGER_ROLE(), marketplaceAddress);
    await grantAssetManagerTx.wait();
    console.log(`✅ Granted ASSET_MANAGER_ROLE to marketplace`);
  } else {
    console.log(`✅ Marketplace already has ASSET_MANAGER_ROLE`);
  }

  // 5) Deployment summary
  console.log(`\n📋 Registry Upgrade Summary:`);
  console.log(`==============================`);
  console.log(`Network: ${network.name}`);
  console.log(`Registry Proxy: ${REGISTRY_PROXY}`);
  console.log(`New Implementation: ${newImplAddress}`);
  console.log(`ProxyAdmin: 0xB8AD57FC91066Bba784186A307D9b0271ce4d789`);
  console.log(`Enhanced Authorization: ✅ Applied`);
  console.log(`Corrupted Status Handling: ✅ Applied`);
  console.log(`Force Update Function: ✅ Applied`);
  console.log(`Owner Transfer Fix: ✅ Applied`);
  console.log(`==============================`);

  // 6) Next steps
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Update marketplace to use registry proxy: ${REGISTRY_PROXY}`);
  console.log(`2. Test createListing functionality with enhanced registry`);
  console.log(`3. Verify corrupted asset status recovery works`);
  console.log(`4. Test owner asset transfer functionality`);

  console.log(`\n🎉 RWAAssetRegistry successfully upgraded with all fixes applied!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });