import hre from "hardhat";
const { ethers, network, upgrades } = hre;
import type { ContractTransactionResponse } from "ethers";

async function main() {
  console.log(`\n🚀 Deploying RWAAssetRegistryUpgradeable as upgradeable contract on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient balance for deployment");
  }

  // 1) Deploy RWAAssetRegistryUpgradeable using OpenZeppelin upgrades
  console.log(`\n1️⃣ Deploying RWAAssetRegistryUpgradeable as upgradeable contract...`);

  const RegistryUpgradeable = await ethers.getContractFactory("contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable");

  const registryProxy = await upgrades.deployProxy(RegistryUpgradeable, [deployer.address], {
    kind: 'transparent',
    initializer: 'initialize',
  });

  await registryProxy.waitForDeployment();
  const registryAddress = await registryProxy.getAddress();
  console.log(`✅ RWAAssetRegistryUpgradeable deployed: ${registryAddress}`);

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(registryAddress);
  console.log(`✅ Implementation address: ${implementationAddress}`);

  // Get proxy admin address
  const adminAddress = await upgrades.erc1967.getAdminAddress(registryAddress);
  console.log(`✅ Proxy admin address: ${adminAddress}`);

  // 2) Verify contract functionality
  console.log(`\n2️⃣ Verifying contract functionality...`);

  // Test basic functionality
  const nextAssetId = await registryProxy.getNextAssetId();
  console.log(`✅ Next Asset ID: ${nextAssetId}`);

  // Test role setup
  const hasAssetManagerRole = await registryProxy.hasRole(await registryProxy.ASSET_MANAGER_ROLE(), deployer.address);
  console.log(`✅ Deployer has ASSET_MANAGER_ROLE: ${hasAssetManagerRole}`);

  const hasDefaultAdminRole = await registryProxy.hasRole(await registryProxy.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log(`✅ Deployer has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);

  // 3) Marketplace roles will be granted separately after deployment
  console.log(`\n3️⃣ Marketplace roles will be granted separately after marketplace deployment`);

  // 4) Generate deployment summary
  console.log(`\n4️⃣ Deployment Summary:`);
  console.log(`==============================`);
  console.log(`Network: ${network.name}`);
  console.log(`RWAAssetRegistryUpgradeable Proxy: ${registryAddress}`);
  console.log(`Implementation: ${implementationAddress}`);
  console.log(`Proxy Admin: ${adminAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Block: ${await ethers.provider.getBlockNumber()}`);
  console.log(`==============================`);

  // 5) Environment update instructions
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Update database with registry contract:`);
  console.log(`   Contract Type: REGISTRY`);
  console.log(`   Contract Address: ${registryAddress}`);
  console.log(`   Network: ${network.name}`);
  console.log(`2. Deploy or update marketplace contract to use new registry`);
  console.log(`3. Grant marketplace roles using separate script`);
  console.log(`4. Test createListing functionality`);
  console.log(`5. Run: bun run scripts/inspect-registry.ts`);
  console.log(`6. Verify Etherscan shows proxy pattern correctly`);

  console.log(`\n🎉 RWAAssetRegistryUpgradeable deployed successfully as upgradeable contract!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });