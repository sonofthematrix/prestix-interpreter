import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n🔄 Updating marketplace registry on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const NEW_REGISTRY = "0x4f641965145c93c81614e47dce16224d5eb2fcf9";
  const MARKETPLACE = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7";

  console.log(`\nNew Registry: ${NEW_REGISTRY}`);
  console.log(`Marketplace: ${MARKETPLACE}\n`);

  // Get marketplace contract with minimal ABI
  const marketplace = await ethers.getContractAt(
    [
      'function assetRegistry() view returns (address)',
      'function setAssetRegistry(address) external',
      'function updateAssetRegistry(address) external'
    ],
    MARKETPLACE
  );

  // Check current registry
  console.log('1️⃣ Checking current registry...');
  const currentRegistry = await marketplace.assetRegistry();
  console.log(`   Current: ${currentRegistry}`);

  if (currentRegistry.toLowerCase() === NEW_REGISTRY.toLowerCase()) {
    console.log(`   ✅ Already configured correctly!\n`);
    return;
  }

  // Try to update
  console.log(`\n2️⃣ Updating to new registry...`);
  
  try {
    // Try setAssetRegistry first
    console.log(`   Trying setAssetRegistry()...`);
    const tx = await marketplace.setAssetRegistry(NEW_REGISTRY);
    console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
    await tx.wait();
    console.log(`   ✅ Updated via setAssetRegistry!\n`);
  } catch (error1: any) {
    console.log(`   ⚠️  setAssetRegistry failed: ${error1.message}`);
    
    try {
      // Try updateAssetRegistry
      console.log(`   Trying updateAssetRegistry()...`);
      const tx = await marketplace.updateAssetRegistry(NEW_REGISTRY);
      console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Updated via updateAssetRegistry!\n`);
    } catch (error2: any) {
      console.error(`   ❌ Both methods failed!`);
      console.error(`   Error: ${error2.message}`);
      throw error2;
    }
  }

  // Verify update
  console.log('3️⃣ Verifying update...');
  const updatedRegistry = await marketplace.assetRegistry();
  console.log(`   New registry: ${updatedRegistry}`);

  if (updatedRegistry.toLowerCase() === NEW_REGISTRY.toLowerCase()) {
    console.log(`   ✅ Successfully updated!\n`);
    console.log('🎉 Marketplace now points to new registry!');
  } else {
    throw new Error(`Update failed! Still showing: ${updatedRegistry}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
