import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n📝 Testing createListing functionality on ${network.name}...`);

  const marketplaceAddress = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7";
  const marketplace = await ethers.getContractAt("RWAMarketplaceUpgradeable", marketplaceAddress);

  console.log(`Marketplace Address: ${marketplaceAddress}`);

  // Test createListing for asset 1
  console.log(`\n🏠 Testing createListing for asset 1...`);

  try {
    // V2 createListing signature: createListing(assetId, pricePerToken, totalTokens)
    const pricePerToken = ethers.parseEther("100"); // $100 per token
    const totalTokens = 1000n; // 1000 tokens total

    const createListingTx = await marketplace.createListing(1, pricePerToken, totalTokens);
    console.log(`✅ createListing transaction submitted: ${createListingTx.hash}`);
    console.log(`   Asset ID: 1`);
    console.log(`   Price per token: ${ethers.formatEther(pricePerToken)} ETH`);
    console.log(`   Total tokens: ${totalTokens}`);

    const receipt = await createListingTx.wait();
    console.log(`✅ createListing transaction confirmed in block ${receipt.blockNumber}`);

    // Check for events
    const events = receipt.logs.map(log => {
      try {
        return marketplace.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    console.log(`📋 Events emitted: ${events.length}`);
    events.forEach((event: any, index: number) => {
      console.log(`   ${index + 1}. ${event.name}:`, event.args);
    });

  } catch (error: any) {
    console.error(`❌ createListing failed:`, error.message);

    // Try to decode the revert reason
    if (error.data) {
      try {
        const decodedError = marketplace.interface.parseError(error.data);
        console.log(`📋 Decoded error: ${decodedError.name}`);
        if (decodedError.args && decodedError.args.length > 0) {
          console.log(`   Args:`, decodedError.args);
        }
      } catch (decodeError) {
        console.log(`❌ Could not decode error data`);
      }
    }
  }

  console.log(`\n📊 Test Summary:`);
  console.log(`================`);
  console.log(`createListing test completed. Check results above.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});