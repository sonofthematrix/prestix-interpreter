import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n🔍 Checking assets in new upgradeable registry on ${network.name}...`);

  const registryAddress = "0x4f641965145c93c81614e47dce16224d5eb2fcf9"; // UPDATED: January 16, 2026
  const registry = await ethers.getContractAt(
    "contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    registryAddress
  );

  console.log(`Registry Address: ${registryAddress}`);

  try {
    const nextAssetId = await registry.getNextAssetId();
    console.log(`Next Asset ID: ${nextAssetId}`);

    // Check assets 1-10
    for (let i = 1; i <= 10; i++) {
      try {
        const asset = await registry.getAsset(i);
        console.log(`Asset ${i}:`, {
          id: asset[0].toString(),
          owner: asset[1],
          title: asset[2],
          status: asset[9].toString() // status is at index 9
        });
      } catch (e) {
        console.log(`Asset ${i}: Not found`);
      }
    }
  } catch (error) {
    console.error('Error checking registry:', error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});