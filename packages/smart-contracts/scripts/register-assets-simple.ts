import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n🔄 Registering assets in new registry on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const NEW_REGISTRY = "0x4f641965145c93c81614e47dce16224d5eb2fcf9";

  // Get registry contract
  const newRegistry = await ethers.getContractAt(
    "contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    NEW_REGISTRY
  );

  console.log(`New Registry: ${NEW_REGISTRY}\n`);

  // Asset data from MARKETPLACE_SETUP_COMPLETE.md
  const assets = [
    {
      id: 1,
      title: "Luxury Beachfront Villa - Maldives",
      description: "Exclusive beachfront property in the Maldives",
      propertyType: "REAL_ESTATE",
      location: "Maldives",
      totalTokens: 1000,
      tokenPrice: "0.001", // ETH per token
      tokenAddress: "0x883BeD27A00f4513AC52606f3fc7Aeb398AA717d"
    },
    {
      id: 2,
      title: "Mountain Resort Estate - Swiss Alps",
      description: "Luxury resort in the Swiss Alps",
      propertyType: "REAL_ESTATE",
      location: "Swiss Alps",
      totalTokens: 1500,
      tokenPrice: "0.002",
      tokenAddress: "0xaCfF6abcd5e04E2ae792cBcd8fD87A15dCC04789"
    },
    {
      id: 3,
      title: "Urban Penthouse - Manhattan",
      description: "Premium penthouse in Manhattan",
      propertyType: "REAL_ESTATE",
      location: "Manhattan, NY",
      totalTokens: 2000,
      tokenPrice: "0.0015",
      tokenAddress: "0xFd25B46C4eC742Ea04a2E5450A001D18f7De2251"
    },
    {
      id: 4,
      title: "Mediterranean Coastal Villa - Greece",
      description: "Stunning coastal villa in Greece",
      propertyType: "REAL_ESTATE",
      location: "Greece",
      totalTokens: 1200,
      tokenPrice: "0.0012",
      tokenAddress: "0x2F74DBEb8f96fBe5779AdDdD4Dfb39b93722BC3c"
    }
  ];

  let registeredCount = 0;

  for (const asset of assets) {
    try {
      console.log(`🔍 Asset ${asset.id}: ${asset.title}`);

      // Check if already registered
      try {
        const existing = await newRegistry.getAsset(asset.id);
        console.log(`   ⚠️  Already registered - skipping\n`);
        continue;
      } catch (e) {
        // Asset doesn't exist, good to register
      }

      const tokenPriceWei = ethers.parseEther(asset.tokenPrice);
      const totalValue = ethers.parseEther((parseFloat(asset.tokenPrice) * asset.totalTokens).toString());

      console.log(`   Owner: ${deployer.address}`);
      console.log(`   Total Tokens: ${asset.totalTokens}`);
      console.log(`   Token Price: ${asset.tokenPrice} ETH`);
      console.log(`   Total Value: ${ethers.formatEther(totalValue)} ETH`);
      console.log(`   Token Address: ${asset.tokenAddress}`);

      // Register asset
      // registerAsset(address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens)
      const registerTx = await newRegistry.registerAsset(
        deployer.address, // owner
        asset.title, // title
        asset.description, // description
        asset.propertyType, // assetType
        asset.location, // location
        totalValue, // price (total property value)
        tokenPriceWei, // tokenPrice (per token)
        asset.totalTokens // totalTokens
      );

      console.log(`   ⏳ Submitting transaction...`);
      const receipt = await registerTx.wait();
      console.log(`   ✅ Registered! Tx: ${receipt.hash}\n`);

      registeredCount++;

    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message, '\n');
    }
  }

  console.log(`📊 Registration Summary:`);
  console.log(`========================`);
  console.log(`Assets registered: ${registeredCount} / ${assets.length}`);

  // Verify registration
  console.log(`\n🔍 Verifying registry state...`);
  const nextAssetId = await newRegistry.getNextAssetId();
  console.log(`Next Asset ID: ${nextAssetId}`);

  if (nextAssetId > 1) {
    console.log(`\n✅ Registered Assets:`);
    for (let i = 1; i < Number(nextAssetId); i++) {
      try {
        const asset = await newRegistry.getAsset(i);
        console.log(`   ✅ Asset ${i}: ${asset[2]}`); // asset[2] is title
      } catch (e) {
        console.log(`   ❌ Asset ${i}: Not found`);
      }
    }
    console.log(`\n🎉 Registration complete!`);
  } else {
    console.log(`⚠️  No assets were registered`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
