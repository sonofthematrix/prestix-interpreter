import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n🧮 Testing marketplace calculation on ${network.name}...`);

  const marketplaceAddress = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7";
  const marketplace = await ethers.getContractAt("RWAMarketplaceUpgradeable", marketplaceAddress);

  console.log(`Marketplace Address: ${marketplaceAddress}`);

  // Test calculation for each registered asset
  const assetsToTest = [
    { id: 1, name: "Luxury Beachfront Villa", expectedTokens: 1000n },
    { id: 2, name: "Downtown Office Building", expectedTokens: 2000n },
    { id: 3, name: "Mountain Resort Estate", expectedTokens: 500n },
  ];

  for (const asset of assetsToTest) {
    console.log(`\n🏠 Testing asset ${asset.id}: ${asset.name}`);

    try {
      // Test calculation for 10 tokens
      const cost = await marketplace.calculatePurchaseCost(asset.id, 10);
      const costInEth = ethers.formatEther(cost);

      console.log(`✅ Calculation successful for 10 tokens: ${costInEth} ETH`);
      console.log(`   Token cost: ~${(Number(costInEth) / 1.025).toFixed(4)} ETH`);
      console.log(`   Fee (2.5%): ~${(Number(costInEth) * 0.025).toFixed(4)} ETH`);

      // Now try to create a listing
      console.log(`📝 Attempting to create listing...`);
      const createListingTx = await marketplace.createListing(asset.id);
      await createListingTx.wait();

      console.log(`✅ Listing created successfully!`);
      console.log(`   Transaction: ${createListingTx.hash}`);

    } catch (error) {
      console.error(`❌ Failed for asset ${asset.id}:`, error.message);

      // Try to decode the revert reason if possible
      if (error.data) {
        try {
          const decodedError = marketplace.interface.parseError(error.data);
          console.log(`   Decoded error: ${decodedError.name}`);
          if (decodedError.args && decodedError.args.length > 0) {
            console.log(`   Error args:`, decodedError.args);
          }
        } catch (decodeError) {
          console.log(`   Could not decode error data`);
        }
      }
    }
  }

  console.log(`\n📊 Test Summary:`);
  console.log(`================`);
  console.log(`All assets tested. Check results above.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});