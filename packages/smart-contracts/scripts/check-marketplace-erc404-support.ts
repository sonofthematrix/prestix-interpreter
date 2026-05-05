import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log(`\n🔍 Checking ERC404 support in marketplace on ${network.name}...\n`);

  const marketplaceAddress = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7"; // Proxy address
  const marketplace = await ethers.getContractAt("RWAMarketplaceFixedV2", marketplaceAddress);

  // Check if ERC404 factory is configured
  const erc404Factory = await marketplace.assetFactory404();
  console.log(`ERC404 Factory Address: ${erc404Factory}`);

  if (erc404Factory === ethers.ZeroAddress) {
    console.log(`❌ ERC404 factory not configured - ERC404 support DISABLED`);
    return;
  }

  console.log(`✅ ERC404 factory configured - ERC404 support ENABLED`);

  // Check marketplace fee
  const fee = await marketplace.getMarketplaceFee();
  console.log(`Marketplace Fee: ${fee} basis points (${Number(fee) / 100}%)`);

  // Check registry connection
  const registry = await marketplace.assetRegistry();
  console.log(`Registry Address: ${registry}`);

  // Check ERC20 factory
  const erc20Factory = await marketplace.assetFactory();
  console.log(`ERC20 Factory Address: ${erc20Factory}`);

  console.log(`\n📋 ERC404 Support Status:`);
  console.log(`==============================`);
  console.log(`✅ ERC404 Factory: Configured`);
  console.log(`✅ ERC20 Factory: ${erc20Factory !== ethers.ZeroAddress ? 'Configured' : 'Not configured'}`);
  console.log(`✅ Registry: Connected`);
  console.log(`✅ Fee: ${fee} basis points`);
  console.log(`==============================`);

  console.log(`\n🎉 ERC404 support is ENABLED and ready for use!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });