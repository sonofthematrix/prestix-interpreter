import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying RWAMarketplaceFixed Implementation...");

  // Deploy the implementation contract
  const MarketplaceFixed = await ethers.getContractFactory("RWAMarketplaceFixed");
  const implementation = await MarketplaceFixed.deploy();

  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();

  console.log("✅ RWAMarketplaceFixed Implementation deployed to:", implementationAddress);
  console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/address/${implementationAddress}`);

  // Save deployment info
  const deploymentInfo = {
    contractName: "RWAMarketplaceFixed",
    contractType: "MARKETPLACE_IMPLEMENTATION",
    address: implementationAddress,
    deployer: (await ethers.getSigners())[0].address,
    network: "sepolia",
    timestamp: new Date().toISOString(),
    bytecodeHash: ethers.keccak256(await implementation.getDeployedCode())
  };

  console.log("📋 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  return implementationAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });