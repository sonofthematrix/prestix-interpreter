import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n📋 Checking if listing was created for asset 1 on ${network.name}...`);

  const marketplaceAddress = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7";
  const marketplace = await ethers.getContractAt("RWAMarketplaceUpgradeable", marketplaceAddress);

  console.log(`Marketplace Address: ${marketplaceAddress}`);

  try {
    // Try getActiveListing function
    console.log(`\n🔍 Checking getActiveListing(1)...`);
    const listing = await marketplace.getActiveListing(1);
    console.log(`✅ Active listing found for asset 1:`);
    console.log(`   Asset ID: ${listing[0]}`);
    console.log(`   Price per token: ${ethers.formatEther(listing[1])} ETH`);
    console.log(`   Total tokens: ${listing[2]}`);
    console.log(`   Available tokens: ${listing[3]}`);
    console.log(`   Seller: ${listing[4]}`);

  } catch (error) {
    console.log(`❌ getActiveListing failed:`, error.message);

    // Try getListings function
    try {
      console.log(`\n🔍 Checking getListings()...`);
      const listings = await marketplace.getListings();
      console.log(`✅ Found ${listings.length} total listings`);

      // Look for asset 1 listing
      const asset1Listing = listings.find((l: any) => l.assetId === 1n || l[0] === 1n);
      if (asset1Listing) {
        console.log(`✅ Asset 1 listing found in array:`);
        console.log(`   Asset ID: ${asset1Listing[0]}`);
        console.log(`   Price per token: ${ethers.formatEther(asset1Listing[1])} ETH`);
        console.log(`   Total tokens: ${asset1Listing[2]}`);
        console.log(`   Available tokens: ${asset1Listing[3]}`);
        console.log(`   Seller: ${asset1Listing[4]}`);
      } else {
        console.log(`❌ Asset 1 listing not found in listings array`);
      }

    } catch (listError) {
      console.log(`❌ getListings also failed:`, listError.message);
    }
  }

  console.log(`\n📊 Verification Summary:`);
  console.log(`=======================`);
  console.log(`Asset 1 listing verification completed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});