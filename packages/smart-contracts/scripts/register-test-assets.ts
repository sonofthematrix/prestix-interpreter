import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n📝 Registering test assets in upgradeable registry on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const registryAddress = "0x8a1fc23bA5BB67AADc85A6B80351D6793e4C3945";
  const registry = await ethers.getContractAt("RWAAssetRegistryUpgradeable", registryAddress);

  console.log(`Registry Address: ${registryAddress}`);

  // Check if deployer has ASSET_MANAGER_ROLE
  const ASSET_MANAGER_ROLE = await registry.ASSET_MANAGER_ROLE();
  const hasAssetManagerRole = await registry.hasRole(ASSET_MANAGER_ROLE, deployer.address);

  if (!hasAssetManagerRole) {
    console.log(`🔑 Granting ASSET_MANAGER_ROLE to deployer...`);
    const grantRoleTx = await registry.grantRole(ASSET_MANAGER_ROLE, deployer.address);
    await grantRoleTx.wait();
    console.log(`✅ ASSET_MANAGER_ROLE granted`);
  } else {
    console.log(`✅ Deployer already has ASSET_MANAGER_ROLE`);
  }

  // Test assets to register
  const testAssets = [
    {
      title: "Luxury Beachfront Villa",
      description: "Stunning 5-bedroom villa with ocean views",
      assetType: "REAL_ESTATE",
      location: "Malibu, CA",
      pricePerToken: ethers.parseEther("100"), // $100 per token
      totalTokens: 1000n
    },
    {
      title: "Downtown Office Building",
      description: "Prime commercial real estate in city center",
      assetType: "COMMERCIAL_PROPERTY",
      location: "New York, NY",
      pricePerToken: ethers.parseEther("50"), // $50 per token
      totalTokens: 2000n
    },
    {
      title: "Mountain Resort Estate",
      description: "Exclusive mountain property with skiing access",
      assetType: "REAL_ESTATE",
      location: "Aspen, CO",
      pricePerToken: ethers.parseEther("200"), // $200 per token
      totalTokens: 500n
    }
  ];

  let registeredCount = 0;

  for (let i = 0; i < testAssets.length; i++) {
    const asset = testAssets[i];
    console.log(`\n🏠 Registering asset ${i + 1}: "${asset.title}"`);

    try {
        // Register the asset
      const registerTx = await registry.registerAsset(
        deployer.address, // owner
        asset.title,
        asset.description,
        asset.assetType,
        asset.location,
        ethers.parseEther("1000000"), // price (total property value)
        asset.pricePerToken, // tokenPrice
        asset.totalTokens // totalTokens
      );

      await registerTx.wait();
      console.log(`✅ Asset registered with transaction: ${registerTx.hash}`);

      // Activate the asset (set status to 1)
      console.log(`🔓 Activating asset...`);
      const assetId = (await registry.getNextAssetId()) - 1n; // Get the ID of the asset we just registered

      const activateTx = await registry.updateAssetStatus(assetId, 1); // ACTIVE status
      await activateTx.wait();
      console.log(`✅ Asset ${assetId} activated with transaction: ${activateTx.hash}`);

      // Verify the asset
      const registeredAsset = await registry.getAsset(assetId);
      console.log(`📋 Verified asset ${assetId}:`, {
        title: registeredAsset[2],
        status: registeredAsset[9].toString(),
        totalTokens: registeredAsset[7].toString(),
        pricePerToken: ethers.formatEther(registeredAsset[6])
      });

      registeredCount++;

    } catch (error) {
      console.error(`❌ Failed to register asset "${asset.title}":`, error.message);
    }
  }

  console.log(`\n📊 Registration Summary:`);
  console.log(`====================`);
  console.log(`Assets registered: ${registeredCount}/${testAssets.length}`);
  console.log(`Next asset ID: ${await registry.getNextAssetId()}`);

  if (registeredCount > 0) {
    console.log(`\n🎉 Test assets registered successfully!`);
    console.log(`You can now test marketplace createListing functionality.`);
  } else {
    console.log(`\n❌ No assets were registered.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});