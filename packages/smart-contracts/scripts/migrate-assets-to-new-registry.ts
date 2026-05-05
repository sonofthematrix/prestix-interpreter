import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n🔄 Migrating assets from old registry to new upgradeable registry on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Contract addresses (UPDATED: January 16, 2026)
  const OLD_REGISTRY = "0xF1f235CD451637d446AfF963dF512D80B8b8Bbae"; // Previous registry
  const NEW_REGISTRY = "0x4f641965145c93c81614e47dce16224d5eb2fcf9"; // NEW REGISTRY FROM ETHERSCAN

  // Get contract instances (use fully qualified names)
  const oldRegistry = await ethers.getContractAt(
    "contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    OLD_REGISTRY
  );
  const newRegistry = await ethers.getContractAt(
    "contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    NEW_REGISTRY
  );

  console.log(`Old Registry: ${OLD_REGISTRY}`);
  console.log(`New Registry: ${NEW_REGISTRY}`);

  try {
    // Get next asset ID from old registry
    const nextAssetId = await oldRegistry.getNextAssetId();
    console.log(`\nNext Asset ID in old registry: ${nextAssetId}`);

    let migratedCount = 0;

    // Migrate assets 1 to nextAssetId-1
    for (let assetId = 1; assetId < nextAssetId; assetId++) {
      try {
        console.log(`\n🔍 Checking asset ${assetId}...`);

        // Get asset from old registry
        const asset = await oldRegistry.getAsset(assetId);
        const [
          id,
          owner,
          title,
          description,
          assetType,
          location,
          pricePerToken,
          totalTokens,
          availableTokens,
          status,
          createdAt,
          updatedAt
        ] = asset;

        console.log(`Found asset ${assetId}: "${title}" owned by ${owner}`);

        // Check if asset already exists in new registry
        try {
          await newRegistry.getAsset(assetId);
          console.log(`⚠️ Asset ${assetId} already exists in new registry - skipping`);
          continue;
        } catch (e) {
          // Asset doesn't exist, good to migrate
        }

        // Register asset in new registry
        console.log(`📝 Registering asset ${assetId} in new registry...`);

        const registerTx = await newRegistry.registerAsset(
          title,
          description,
          assetType,
          location,
          pricePerToken,
          totalTokens,
          owner
        );

        await registerTx.wait();
        console.log(`✅ Asset ${assetId} registered in new registry`);

        // If asset was active (status = 1), activate it in new registry
        if (status === 1n) {
          console.log(`🔓 Activating asset ${assetId}...`);
          const activateTx = await newRegistry.updateAssetStatus(assetId, 1);
          await activateTx.wait();
          console.log(`✅ Asset ${assetId} activated`);
        } else {
          console.log(`ℹ️ Asset ${assetId} status: ${status} (not activating)`);
        }

        migratedCount++;
        console.log(`✅ Asset ${assetId} migration complete`);

      } catch (error) {
        console.error(`❌ Error migrating asset ${assetId}:`, error.message);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`==================`);
    console.log(`Assets migrated: ${migratedCount}`);
    console.log(`Total assets checked: ${Number(nextAssetId) - 1}`);

    // Verify migration
    console.log(`\n🔍 Verifying migration...`);
    const newNextAssetId = await newRegistry.getNextAssetId();
    console.log(`New registry next asset ID: ${newNextAssetId}`);

    if (newNextAssetId >= nextAssetId) {
      console.log(`✅ Migration successful!`);
    } else {
      console.log(`⚠️ Migration may be incomplete`);
    }

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});