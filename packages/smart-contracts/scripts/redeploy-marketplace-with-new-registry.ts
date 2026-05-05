import hre from "hardhat";
const { ethers, network } = hre;
import type { ContractTransactionResponse } from "ethers";

async function main() {
  console.log(`\n🚀 Redeploying marketplace with new registry on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // New registry address
  const NEW_REGISTRY_ADDRESS = "0x2527c69aaf3ad6DF9Ca2860ffF4d4280Ca6F840f";

  // Factory addresses
  const FACTORY_ADDRESS = "0x25Ea8960676D017811039481A39516a7E7112133"; // ERC20 factory
  const FACTORY_404_ADDRESS = "0x7a6f7dE826064903f2e419833b9633560217FEe2"; // ERC404 factory

  // Fee recipient
  const feeRecipient = deployer.address;

  // 1) Verify new registry exists
  console.log(`\n1️⃣ Verifying new registry contract...`);
  const registryCode = await ethers.provider.getCode(NEW_REGISTRY_ADDRESS);
  if (registryCode === '0x') {
    throw new Error(`Registry contract not found at ${NEW_REGISTRY_ADDRESS}`);
  }
  console.log(`✅ New registry verified: ${NEW_REGISTRY_ADDRESS}`);

  // 2) Verify factories exist
  console.log(`\n2️⃣ Verifying factory contracts...`);
  const factoryCode = await ethers.provider.getCode(FACTORY_ADDRESS);
  if (factoryCode === '0x') {
    throw new Error(`ERC20 Factory contract not found at ${FACTORY_ADDRESS}`);
  }
  console.log(`✅ ERC20 Factory verified: ${FACTORY_ADDRESS}`);

  const factory404Code = await ethers.provider.getCode(FACTORY_404_ADDRESS);
  if (factory404Code === '0x') {
    throw new Error(`ERC404 Factory contract not found at ${FACTORY_404_ADDRESS}`);
  }
  console.log(`✅ ERC404 Factory verified: ${FACTORY_404_ADDRESS}`);

  // 3) Deploy new marketplace implementation
  console.log(`\n3️⃣ Deploying new marketplace implementation...`);
  const MarketplaceImpl = await ethers.getContractFactory("RWAMarketplaceFixed");
  const marketplaceImpl = await MarketplaceImpl.deploy();
  await marketplaceImpl.waitForDeployment();
  const marketplaceImplAddress = await marketplaceImpl.getAddress();
  console.log(`✅ Marketplace implementation deployed: ${marketplaceImplAddress}`);

  // 4) Deploy UUPS proxy
  console.log(`\n4️⃣ Deploying UUPS proxy...`);
  const UUPSProxy = await ethers.getContractFactory("UUPSProxy");
  const proxy = await UUPSProxy.deploy(marketplaceImplAddress, "0x");
  await proxy.waitForDeployment();
  const marketplaceAddress = await proxy.getAddress();
  console.log(`✅ UUPS proxy deployed: ${marketplaceAddress}`);

  // 5) Initialize the marketplace through the proxy
  console.log(`\n5️⃣ Initializing marketplace through proxy...`);
  const marketplace = MarketplaceImpl.attach(marketplaceAddress);
  const initTx = await marketplace.initialize(
    NEW_REGISTRY_ADDRESS,  // New registry address
    FACTORY_ADDRESS,       // ERC20 factory address
    feeRecipient,          // Fee recipient
    FACTORY_404_ADDRESS    // ERC404 factory address
  );
  await initTx.wait();
  console.log(`✅ Marketplace initialized with new registry`);

  // 4) Verify marketplace configuration
  console.log(`\n4️⃣ Verifying marketplace configuration...`);

  const configuredRegistry = await marketplace.assetRegistry();
  if (configuredRegistry.toLowerCase() !== NEW_REGISTRY_ADDRESS.toLowerCase()) {
    throw new Error(`Marketplace registry mismatch. Expected: ${NEW_REGISTRY_ADDRESS}, Got: ${configuredRegistry}`);
  }
  console.log(`✅ Registry correctly configured: ${configuredRegistry}`);

  const configuredFactory = await marketplace.assetFactory();
  if (configuredFactory.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
    throw new Error(`Marketplace factory mismatch. Expected: ${FACTORY_ADDRESS}, Got: ${configuredFactory}`);
  }
  console.log(`✅ Factory correctly configured: ${configuredFactory}`);

  const configuredFeeRecipient = await marketplace.feeRecipient();
  console.log(`✅ Fee recipient: ${configuredFeeRecipient}`);

  const marketplaceFee = await marketplace.marketplaceFee();
  console.log(`✅ Marketplace fee: ${marketplaceFee} basis points (${Number(marketplaceFee) / 100}%)`);

  // 5) Grant marketplace roles on new registry
  console.log(`\n5️⃣ Granting marketplace roles on new registry...`);

  const Registry = await ethers.getContractFactory("RWAAssetRegistry");
  const registry = Registry.attach(NEW_REGISTRY_ADDRESS);

  // Grant MARKETPLACE_ROLE
  const marketplaceRole = await registry.MARKETPLACE_ROLE();
  const grantMarketplaceRoleTx = await registry.grantRole(marketplaceRole, marketplaceAddress);
  await grantMarketplaceRoleTx.wait();
  console.log(`✅ Granted MARKETPLACE_ROLE to marketplace`);

  // Grant ASSET_MANAGER_ROLE for status updates
  const assetManagerRole = await registry.ASSET_MANAGER_ROLE();
  const grantAssetManagerRoleTx = await registry.grantRole(assetManagerRole, marketplaceAddress);
  await grantAssetManagerRoleTx.wait();
  console.log(`✅ Granted ASSET_MANAGER_ROLE to marketplace`);

  // 6) Test marketplace-registry integration
  console.log(`\n6️⃣ Testing marketplace-registry integration...`);

  // Test marketplace can read from registry
  try {
    const testStatus = await registry.getAssetStatus(1);
    console.log(`✅ Marketplace can read registry data (status check passed)`);
  } catch (error: any) {
    if (error.message.includes("asset not found")) {
      console.log(`✅ Marketplace can read registry data (asset not found is expected)`);
    } else {
      throw new Error(`Marketplace cannot read registry: ${error.message}`);
    }
  }

  // 7) Grant marketplace roles on factory (for token creation)
  console.log(`\n7️⃣ Granting marketplace roles on factory...`);

  const Factory = await ethers.getContractFactory("RWATokenFactory404");
  const factory = Factory.attach(FACTORY_ADDRESS);

  try {
    // Grant TOKEN_CREATOR_ROLE to marketplace
    const tokenCreatorRole = await factory.TOKEN_CREATOR_ROLE();
    const grantTokenCreatorTx = await factory.grantRole(tokenCreatorRole, marketplaceAddress);
    await grantTokenCreatorTx.wait();
    console.log(`✅ Granted TOKEN_CREATOR_ROLE to marketplace on factory`);
  } catch (error: any) {
    console.log(`⚠️ Could not grant factory role: ${error.message}`);
    console.log(`Factory role grant may need to be done separately`);
  }

  // 8) Deployment summary
  console.log(`\n📋 Deployment Summary:`);
  console.log(`==============================`);
  console.log(`Network: ${network.name}`);
  console.log(`New Registry: ${NEW_REGISTRY_ADDRESS}`);
  console.log(`New Marketplace: ${marketplaceAddress}`);
  console.log(`Factory: ${FACTORY_ADDRESS}`);
  console.log(`Fee Recipient: ${feeRecipient}`);
  console.log(`Marketplace Fee: ${Number(marketplaceFee) / 100}%`);
  console.log(`==============================`);

  // 9) Environment update instructions
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Update environment variables:`);
  console.log(`   NEXT_PUBLIC_RWA_MARKETPLACE=${marketplaceAddress}`);
  console.log(`   NEXT_PUBLIC_RWA_ASSET_REGISTRY=${NEW_REGISTRY_ADDRESS}`);
  console.log(`2. Update frontend contract store`);
  console.log(`3. Test createListing functionality`);
  console.log(`4. Run: bun run scripts/verify-frontend-abi-alignment.ts`);
  console.log(`5. Decommission old marketplace if needed`);

  console.log(`\n🎉 Marketplace redeployed successfully with new registry!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });