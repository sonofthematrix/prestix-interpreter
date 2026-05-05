import { ethers, upgrades, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log(`\n🚀 Deploying upgradeable contracts to ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  console.log(`Fee Recipient: ${feeRecipient}`);

  // 1. Deploy Registry with TransparentProxy
  console.log("\n1️⃣ Deploying RWAAssetRegistryUpgradeable...");
  const Registry = await ethers.getContractFactory("RWAAssetRegistryUpgradeable");
  const registry = await upgrades.deployProxy(
    Registry,
    [deployer.address],
    { 
      kind: "transparent",
      initializer: "initialize"
    }
  );
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  const registryImpl = await upgrades.erc1967.getImplementationAddress(registryAddress);
  const registryAdmin = await upgrades.erc1967.getAdminAddress(registryAddress);
  
  console.log(`✅ Registry Proxy: ${registryAddress}`);
  console.log(`   Implementation: ${registryImpl}`);
  console.log(`   ProxyAdmin: ${registryAdmin}`);

  // 2. Deploy Factory with TransparentProxy
  console.log("\n2️⃣ Deploying RWATokenFactoryUpgradeable...");
  const Factory = await ethers.getContractFactory("RWATokenFactoryUpgradeable");
  const factory = await upgrades.deployProxy(
    Factory,
    [deployer.address],
    { 
      kind: "transparent",
      initializer: "initialize"
    }
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  const factoryImpl = await upgrades.erc1967.getImplementationAddress(factoryAddress);
  const factoryAdmin = await upgrades.erc1967.getAdminAddress(factoryAddress);
  
  console.log(`✅ Factory Proxy: ${factoryAddress}`);
  console.log(`   Implementation: ${factoryImpl}`);
  console.log(`   ProxyAdmin: ${factoryAdmin}`);

  // 3. Deploy Marketplace with TransparentProxy
  console.log("\n3️⃣ Deploying RWAMarketplaceUpgradeable...");
  const Marketplace = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
  const marketplace = await upgrades.deployProxy(
    Marketplace,
    [registryAddress, factoryAddress, feeRecipient, deployer.address],
    { 
      kind: "transparent",
      initializer: "initialize"
    }
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  const marketplaceImpl = await upgrades.erc1967.getImplementationAddress(marketplaceAddress);
  const marketplaceAdmin = await upgrades.erc1967.getAdminAddress(marketplaceAddress);
  
  console.log(`✅ Marketplace Proxy: ${marketplaceAddress}`);
  console.log(`   Implementation: ${marketplaceImpl}`);
  console.log(`   ProxyAdmin: ${marketplaceAdmin}`);

  // 4. Deploy Membership with TransparentProxy
  console.log("\n4️⃣ Deploying MembershipSystemUpgradeable...");
  const Membership = await ethers.getContractFactory("MembershipSystemUpgradeable");
  const membership = await upgrades.deployProxy(
    Membership,
    [deployer.address],
    { 
      kind: "transparent",
      initializer: "initialize"
    }
  );
  await membership.waitForDeployment();
  const membershipAddress = await membership.getAddress();
  const membershipImpl = await upgrades.erc1967.getImplementationAddress(membershipAddress);
  const membershipAdmin = await upgrades.erc1967.getAdminAddress(membershipAddress);
  
  console.log(`✅ Membership Proxy: ${membershipAddress}`);
  console.log(`   Implementation: ${membershipImpl}`);
  console.log(`   ProxyAdmin: ${membershipAdmin}`);

  // 5. Wire up permissions
  console.log("\n5️⃣ Configuring permissions...");
  
  // Grant marketplace role to marketplace contract
  const addMarketplaceTx = await registry.addMarketplace(marketplaceAddress);
  await addMarketplaceTx.wait();
  console.log(`🔐 Granted MARKETPLACE_ROLE to marketplace on registry`);
  
  // Grant token creator role to marketplace
  const addTokenCreatorTx = await factory.addTokenCreator(marketplaceAddress);
  await addTokenCreatorTx.wait();
  console.log(`🔐 Granted TOKEN_CREATOR_ROLE to marketplace on factory`);

  // 6. Optional: Set marketplace fee
  const marketplaceFeeBps = process.env.MARKETPLACE_FEE_BPS;
  if (marketplaceFeeBps) {
    const setFeeTx = await marketplace.setMarketplaceFee(parseInt(marketplaceFeeBps));
    await setFeeTx.wait();
    console.log(`💸 Marketplace fee set to ${marketplaceFeeBps} bps`);
  }

  // 7. Save deployment info
  const deployment = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      RWAAssetRegistry: {
        proxy: registryAddress,
        implementation: registryImpl,
        proxyAdmin: registryAdmin
      },
      RWATokenFactory: {
        proxy: factoryAddress,
        implementation: factoryImpl,
        proxyAdmin: factoryAdmin
      },
      RWAMarketplace: {
        proxy: marketplaceAddress,
        implementation: marketplaceImpl,
        proxyAdmin: marketplaceAdmin
      },
      MembershipSystem: {
        proxy: membershipAddress,
        implementation: membershipImpl,
        proxyAdmin: membershipAdmin
      }
    },
    permissions: {
      marketplaceHasRegistryRole: true,
      marketplaceHasFactoryRole: true
    },
    gasUsed: {
      registry: "estimated",
      factory: "estimated", 
      marketplace: "estimated",
      membership: "estimated"
    }
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const outFile = path.join(outDir, `${network.name}-upgradeable.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  
  console.log(`\n📝 Deployment saved to deployments/${network.name}-upgradeable.json`);
  
  // 8. Display summary
  console.log("\n🎉 Deployment Summary:");
  console.log("===================");
  console.log(`Network: ${network.name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Fee Recipient: ${feeRecipient}`);
  console.log("\nContract Addresses:");
  console.log(`├─ Registry:     ${registryAddress}`);
  console.log(`├─ Factory:      ${factoryAddress}`);
  console.log(`├─ Marketplace:  ${marketplaceAddress}`);
  console.log(`└─ Membership:   ${membershipAddress}`);
  
  console.log("\n🔗 Next Steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Update database with contract addresses");
  console.log("3. Test contract interactions");
  console.log("4. Configure admin dashboard");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
