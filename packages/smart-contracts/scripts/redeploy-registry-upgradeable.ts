import hre from "hardhat";
const { ethers, network, upgrades } = hre;
import type { ContractTransactionResponse } from "ethers";

async function main() {
  console.log(`\n🚀 Redeploying RWAAssetRegistry as upgradeable contract on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // 1) Deploy RWAAssetRegistryUpgradeable implementation
  console.log(`\n1️⃣ Deploying RWAAssetRegistryUpgradeable implementation...`);
  const RegistryUpgradeable = await ethers.getContractFactory("RWAAssetRegistryUpgradeable");
  const registryImpl = await RegistryUpgradeable.deploy();
  await registryImpl.waitForDeployment();
  const registryImplAddress = await registryImpl.getAddress();
  console.log(`✅ Implementation deployed: ${registryImplAddress}`);

  // 2) Deploy TransparentUpgradeableProxy
  console.log(`\n2️⃣ Deploying TransparentUpgradeableProxy...`);

  // Get ProxyAdmin address (should be the same as before)
  const proxyAdminAddress = "0xB8AD57FC91066Bba784186A307D9b0271ce4d789";

  // Prepare initialization data for the registry
  const initData = RegistryUpgradeable.interface.encodeFunctionData("initialize", [deployer.address]);

  const TransparentProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
  const registryProxy = await TransparentProxy.deploy(
    registryImplAddress,
    proxyAdminAddress,
    initData
  );
  await registryProxy.waitForDeployment();
  const registryProxyAddress = await registryProxy.getAddress();
  console.log(`✅ Proxy deployed: ${registryProxyAddress}`);

  // 3) Verify the proxy is working
  console.log(`\n3️⃣ Verifying proxy functionality...`);

  // Connect to the proxy as the registry interface
  const registry = RegistryUpgradeable.attach(registryProxyAddress);

  // Test basic functions
  const nextAssetId = await registry.getNextAssetId();
  console.log(`✅ Next Asset ID: ${nextAssetId}`);

  const hasAdminRole = await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log(`✅ Deployer has DEFAULT_ADMIN_ROLE: ${hasAdminRole}`);

  const hasAssetManagerRole = await registry.hasRole(await registry.ASSET_MANAGER_ROLE(), deployer.address);
  console.log(`✅ Deployer has ASSET_MANAGER_ROLE: ${hasAssetManagerRole}`);

  // 4) Grant roles to marketplace
  console.log(`\n4️⃣ Granting roles to marketplace...`);

  const marketplaceAddress = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7";

  // Grant MARKETPLACE_ROLE
  const grantMarketplaceTx = await registry.grantRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress);
  await grantMarketplaceTx.wait();
  console.log(`✅ Granted MARKETPLACE_ROLE to marketplace: ${marketplaceAddress}`);

  // Grant ASSET_MANAGER_ROLE
  const grantAssetManagerTx = await registry.grantRole(await registry.ASSET_MANAGER_ROLE(), marketplaceAddress);
  await grantAssetManagerTx.wait();
  console.log(`✅ Granted ASSET_MANAGER_ROLE to marketplace: ${marketplaceAddress}`);

  // 5) Deployment summary
  console.log(`\n📋 Upgradeable Registry Deployment Summary:`);
  console.log(`==============================`);
  console.log(`Network: ${network.name}`);
  console.log(`Implementation: ${registryImplAddress}`);
  console.log(`Proxy: ${registryProxyAddress}`);
  console.log(`ProxyAdmin: ${proxyAdminAddress}`);
  console.log(`Next Asset ID: ${nextAssetId}`);
  console.log(`Marketplace Roles: Granted`);
  console.log(`==============================`);

  // 6) Next steps
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Update marketplace to use new registry proxy: ${registryProxyAddress}`);
  console.log(`2. Update frontend environment variables:`);
  console.log(`   NEXT_PUBLIC_RWA_ASSET_REGISTRY=${registryProxyAddress}`);
  console.log(`3. Update database contract records`);
  console.log(`4. Test asset registration and marketplace functionality`);
  console.log(`5. Verify Etherscan shows proxy pattern correctly`);

  console.log(`\n🎉 RWAAssetRegistry successfully deployed as upgradeable contract!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });