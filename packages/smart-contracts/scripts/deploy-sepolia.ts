import hre from "hardhat";
const { ethers, network } = hre;
import type { ContractTransactionResponse } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  console.log(`\n🚀 Deploying contracts to ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const marketplaceFeeBps = process.env.MARKETPLACE_FEE_BPS
    ? Number(process.env.MARKETPLACE_FEE_BPS)
    : undefined; // optional

  // 1) Deploy RWAAssetRegistry
  const Registry = await ethers.getContractFactory("RWAAssetRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`✅ RWAAssetRegistry deployed: ${registryAddress}`);

  // 2) Deploy RWATokenFactory
  const Factory = await ethers.getContractFactory("RWATokenFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✅ RWATokenFactory deployed: ${factoryAddress}`);

  // 3) Deploy RWAMarketplace
  const Marketplace = await ethers.getContractFactory("RWAMarketplace");
  const marketplace = await Marketplace.deploy(
    registryAddress,
    factoryAddress,
    feeRecipient
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`✅ RWAMarketplace deployed: ${marketplaceAddress}`);

  // 4) Post-deploy wiring
  // 4a) Registry: grant MARKETPLACE_ROLE to marketplace
  const tx1 = (await registry.addMarketplace(
    marketplaceAddress
  )) as ContractTransactionResponse;
  await tx1.wait();
  console.log(`🔐 Granted MARKETPLACE_ROLE to marketplace on registry`);

  // 4b) Factory: grant TOKEN_CREATOR_ROLE to marketplace (needed for minting)
  const tx2 = (await factory.addTokenCreator(
    marketplaceAddress
  )) as ContractTransactionResponse;
  await tx2.wait();
  console.log(`🔐 Granted TOKEN_CREATOR_ROLE to marketplace on factory`);

  // 4c) Optional: set marketplace fee
  if (typeof marketplaceFeeBps === "number") {
    const setFeeTx = (await marketplace.setMarketplaceFee(
      marketplaceFeeBps
    )) as ContractTransactionResponse;
    await setFeeTx.wait();
    console.log(`💸 Marketplace fee set to ${marketplaceFeeBps} bps`);
  }

  // 5) Persist addresses
  const out = {
    network: network.name,
    deployer: deployer.address,
    feeRecipient,
    contracts: {
      RWAAssetRegistry: registryAddress,
      RWATokenFactory: factoryAddress,
      RWAMarketplace: marketplaceAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "../deployments");
  const outFile = path.join(outDir, `${network.name}.json`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`📝 Deployment addresses saved to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


