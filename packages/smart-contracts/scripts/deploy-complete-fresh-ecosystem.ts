#!/usr/bin/env tsx
/**
 * COMPLETE FRESH ECOSYSTEM DEPLOYMENT
 * 
 * Deploys the ENTIRE RWA marketplace ecosystem from absolute scratch:
 * 1. RWAAssetRegistryUpgradeable (UUPS Proxy)
 * 2. RWATokenFactoryUpgradeable (UUPS Proxy)
 * 3. RWATokenFactory404Fixed (Direct, non-upgradeable)
 * 4. RWAMarketplaceFixedV2 OR RWAMarketplaceUpgradeableSetter (UUPS Proxy)
 * 
 * Features:
 * - Uses ONLY the latest contract versions with all fixes
 * - Stores ALL contracts and ABIs in database
 * - Configures ALL roles and permissions
 * - Verifies ALL contracts on Etherscan
 * - Step-by-step with comprehensive logging
 * - Generates deployment summary report
 * 
 * Usage:
 *   cd packages/smart-contracts
 *   bun run tsx scripts/deploy-complete-fresh-ecosystem.ts
 */

import 'dotenv/config';
import { ethers, upgrades, network } from "hardhat";
import hre from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import * as fs from "fs";
import * as path from "path";
import { createClient } from '../../../src/lib/db';
import { createHash } from 'crypto';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

// Configuration
const NETWORK_ID = '11155111'; // Sepolia
const NETWORK_NAME = 'sepolia';
const MARKETPLACE_FEE_BPS = 250; // 2.5%

// Deployment state
interface DeploymentState {
  registry: {
    proxy: string;
    implementation: string;
    abiStored: boolean;
  };
  factory: {
    proxy: string;
    implementation: string;
    abiStored: boolean;
  };
  factory404: {
    address: string;
    abiStored: boolean;
  };
  marketplace: {
    proxy: string;
    implementation: string;
    abiStored: boolean;
  };
  rolesConfigured: {
    registryMarketplaceRole: boolean;
    factoryTokenCreatorRole: boolean;
    factory404TokenCreatorRole: boolean;
  };
  verifiedOnEtherscan: {
    registry: boolean;
    factory: boolean;
    factory404: boolean;
    marketplace: boolean;
  };
}

/**
 * Helper: Verify contract on Etherscan with retry logic
 */
async function verifyContractOnEtherscan(
  contractAddress: string,
  contractName: string,
  constructorArgs: any[] = [],
  maxRetries: number = 5
): Promise<void> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n      🔍 Verification attempt ${attempt}/${maxRetries}...`);

      await hre.run('verify:verify', {
        address: contractAddress,
        constructorArguments: constructorArgs,
        contract: `contracts/core/${contractName}.sol:${contractName}`,
      });

      console.log(`      ✅ Contract verified successfully!`);
      console.log(`      📋 View: https://sepolia.etherscan.io/address/${contractAddress}#code`);
      return;

    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log(`      ✅ Contract already verified!`);
        return;
      }

      if (attempt === maxRetries) {
        console.error(`      ❌ Verification failed after ${maxRetries} attempts`);
        throw error;
      }

      const backoffDelay = Math.min(5000 * Math.pow(2, attempt - 1), 80000);
      console.log(`      ⏳ Retrying in ${backoffDelay / 1000} seconds...`);
      await delay(backoffDelay);
    }
  }
}

/**
 * Helper: Store contract in database
 */
async function storeContractInDatabase(
  contractAddress: string,
  contractName: string,
  contractType: string,
  deploymentTx: string,
  deployerAddress: string,
  abiHash: string,
  isUpgradeable: boolean,
  proxyType?: string,
  implementationAddress?: string
): Promise<void> {
  const db = createClient(systemUser);

  console.log(`      💾 Storing ${contractName} in database...`);

  // Get deployment block number from transaction
  let deploymentBlock = BigInt(0);
  try {
    if (deploymentTx) {
      const receipt = await hre.ethers.provider.getTransactionReceipt(deploymentTx);
      if (receipt) {
        deploymentBlock = BigInt(receipt.blockNumber);
      }
    }
  } catch (error) {
    console.warn(`      ⚠️  Could not fetch deployment block, using 0`);
  }

  // Check for existing contract by unique constraint (networkId + contractType)
  const existing = await db.deployedContract.findFirst({
    where: {
      networkId: NETWORK_ID,
      contractType: contractType,
    } as any
  });

  const contractData = {
    contractAddress: contractAddress.toLowerCase(),
    contractName,
    contractType,
    networkId: NETWORK_ID,
    deploymentTx,
    deployedBy: deployerAddress,
    deploymentBlock,
    deployedAt: new Date(),
    abiHash,
    isUpgradeable,
    proxyType: proxyType || null,
    implementationAddress: implementationAddress || null,
    isActive: true,
    version: "1.0.0",
  };

  if (existing) {
    console.log(`      ℹ️  Contract already exists in database, updating...`);
    await db.deployedContract.update({
      where: { id: existing.id },
      data: contractData as any
    });
  } else {
    await db.deployedContract.create({
      data: contractData as any
    });
  }

  console.log(`      ✅ Contract stored in database`);
}

/**
 * Helper: Store ABI in database
 */
async function storeABIInDatabase(
  contractAddress: string,
  abi: any[]
): Promise<void> {
  const db = createClient(systemUser);

  console.log(`      💾 Storing ABI in database...`);

  // Parse ABI into categorized sections
  const functions = abi.filter((item: any) => item.type === 'function');
  const events = abi.filter((item: any) => item.type === 'event');
  const errors = abi.filter((item: any) => item.type === 'error');

  const parsedFunctions = {
    read: functions.filter((f: any) => ['view', 'pure'].includes(f.stateMutability)),
    write: functions.filter((f: any) => !['view', 'pure'].includes(f.stateMutability)),
    all: functions,
  };

  const existing = await db.contractABI.findFirst({
    where: {
      contractAddress: contractAddress.toLowerCase(),
      networkId: NETWORK_ID,
    } as any
  });

  const abiData = {
    contractAddress: contractAddress.toLowerCase(),
    networkId: NETWORK_ID,
    abi: abi,
    parsedFunctions: parsedFunctions,
    parsedEvents: events,
    parsedErrors: errors.length > 0 ? errors : null,
    isVerified: true,
  };

  if (existing) {
    console.log(`      ℹ️  ABI already exists, updating...`);
    await db.contractABI.update({
      where: { id: existing.id },
      data: abiData as any
    });
  } else {
    await db.contractABI.create({
      data: abiData as any
    });
  }

  console.log(`      ✅ ABI stored (${functions.length} functions, ${events.length} events)`);
}

/**
 * Step 1: Deploy RWAAssetRegistryUpgradeable
 */
async function deployRegistry(deployer: any): Promise<{ proxy: string; implementation: string }> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   STEP 1: Deploy RWAAssetRegistryUpgradeable (UUPS)       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("   📦 Deploying proxy with implementation...");

  const RWAAssetRegistryUpgradeable = await ethers.getContractFactory("contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable");
  const registryProxy = await upgrades.deployProxy(
    RWAAssetRegistryUpgradeable,
    [deployer.address], // initialize(address admin)
    {
      kind: "uups",
      constructorArgs: [],
      timeout: 0,
    }
  );
  await registryProxy.waitForDeployment();
  const proxyAddress = await registryProxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`   ✅ Proxy: ${proxyAddress}`);
  console.log(`   ✅ Implementation: ${implAddress}`);

  // Read ABI and calculate hash
  const artifact = await hre.artifacts.readArtifact('contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable');
  const abiHash = createHash('sha256').update(JSON.stringify(artifact.abi)).digest('hex');

  // Store in database
  await storeContractInDatabase(
    proxyAddress,
    'RWAAssetRegistryUpgradeable',
    'REGISTRY',
    registryProxy.deploymentTransaction()?.hash || '',
    deployer.address,
    abiHash,
    true,
    'UUPS',
    implAddress
  );

  // Store ABI
  await storeABIInDatabase(proxyAddress, artifact.abi);

  // Verify on Etherscan
  console.log("\n   🔍 Verifying on Etherscan...");
  await verifyContractOnEtherscan(implAddress, 'RWAAssetRegistryUpgradeable', []);

  return { proxy: proxyAddress, implementation: implAddress };
}

/**
 * Step 2: Deploy RWATokenFactoryUpgradeable
 */
async function deployFactory(deployer: any): Promise<{ proxy: string; implementation: string }> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   STEP 2: Deploy RWATokenFactoryUpgradeable (UUPS)        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("   📦 Deploying proxy with implementation...");

  const RWATokenFactoryUpgradeable = await ethers.getContractFactory("contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable");
  const factoryProxy = await upgrades.deployProxy(
    RWATokenFactoryUpgradeable,
    [deployer.address], // initialize(address admin)
    {
      kind: "uups",
      constructorArgs: [],
      timeout: 0,
    }
  );
  await factoryProxy.waitForDeployment();
  const proxyAddress = await factoryProxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`   ✅ Proxy: ${proxyAddress}`);
  console.log(`   ✅ Implementation: ${implAddress}`);

  // Read ABI and calculate hash
  const artifact = await hre.artifacts.readArtifact('contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable');
  const abiHash = createHash('sha256').update(JSON.stringify(artifact.abi)).digest('hex');

  // Store in database
  await storeContractInDatabase(
    proxyAddress,
    'RWATokenFactoryUpgradeable',
    'FACTORY',
    factoryProxy.deploymentTransaction()?.hash || '',
    deployer.address,
    abiHash,
    true,
    'UUPS',
    implAddress
  );

  // Store ABI
  await storeABIInDatabase(proxyAddress, artifact.abi);

  // Verify on Etherscan
  console.log("\n   🔍 Verifying on Etherscan...");
  await verifyContractOnEtherscan(implAddress, 'RWATokenFactoryUpgradeable', []);

  return { proxy: proxyAddress, implementation: implAddress };
}

/**
 * Step 3: Deploy RWATokenFactory404Fixed
 */
async function deployFactory404(deployer: any): Promise<string> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   STEP 3: Deploy RWATokenFactory404Fixed (Direct)         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("   📦 Deploying contract directly (non-upgradeable)...");

  const RWATokenFactory404Fixed = await ethers.getContractFactory("contracts/core/RWATokenFactory404Fixed.sol:RWATokenFactory404Fixed");
  const factory404 = await RWATokenFactory404Fixed.deploy();
  await factory404.waitForDeployment();
  const factory404Address = await factory404.getAddress();

  console.log(`   ✅ Address: ${factory404Address}`);

  // Read ABI and calculate hash
  const artifact = await hre.artifacts.readArtifact('contracts/core/RWATokenFactory404Fixed.sol:RWATokenFactory404Fixed');
  const abiHash = createHash('sha256').update(JSON.stringify(artifact.abi)).digest('hex');

  // Store in database
  await storeContractInDatabase(
    factory404Address,
    'RWATokenFactory404Fixed',
    'ERC404_FACTORY',
    factory404.deploymentTransaction()?.hash || '',
    deployer.address,
    abiHash,
    false
  );

  // Store ABI
  await storeABIInDatabase(factory404Address, artifact.abi);

  // Verify on Etherscan
  console.log("\n   🔍 Verifying on Etherscan...");
  await verifyContractOnEtherscan(factory404Address, 'RWATokenFactory404Fixed', []);

  return factory404Address;
}

/**
 * Step 4: Deploy RWAMarketplaceUpgradeableSetter
 */
async function deployMarketplace(
  deployer: any,
  registryAddress: string,
  factoryAddress: string,
  factory404Address: string
): Promise<{ proxy: string; implementation: string }> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   STEP 4: Deploy RWAMarketplaceUpgradeableSetter (UUPS)   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("   📦 Deploying proxy with implementation...");
  console.log(`      Registry: ${registryAddress}`);
  console.log(`      Factory: ${factoryAddress}`);
  console.log(`      Factory404: ${factory404Address}`);
  console.log(`      Fee Recipient: ${deployer.address}`);
  console.log(`      Marketplace Fee: ${MARKETPLACE_FEE_BPS} bps (${MARKETPLACE_FEE_BPS / 100}%)`);

  // Get USDC and TKNZN addresses from environment or use defaults
  const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const TKNZN_ADDRESS = process.env.NEXT_PUBLIC_TKNZN_ADDRESS || "0x064682F1555d3baD3Dab5eDD0DEe45372F23a570";
  const INITIAL_PAYMENT_TOKENS = [USDC_ADDRESS, TKNZN_ADDRESS];

  const TOKEN_URI_BASE = "https://tokenizin.com/assets/"; // Base URI for token metadata

  const RWAMarketplaceUpgradeableSetter = await ethers.getContractFactory("contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter");
  const marketplaceProxy = await upgrades.deployProxy(
    RWAMarketplaceUpgradeableSetter,
    [
      registryAddress,        // assetRegistry_
      factoryAddress,         // tokenFactory_
      deployer.address,       // feeRecipient_
      factory404Address,      // tokenFactory404_
      INITIAL_PAYMENT_TOKENS, // initialPaymentTokens_
      deployer.address,       // admin_
      TOKEN_URI_BASE          // tokenUriBase_
    ],
    {
      kind: "uups",
      constructorArgs: [],
      timeout: 0,
    }
  );
  await marketplaceProxy.waitForDeployment();
  const proxyAddress = await marketplaceProxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`   ✅ Proxy: ${proxyAddress}`);
  console.log(`   ✅ Implementation: ${implAddress}`);

  // Read ABI and calculate hash
  const artifact = await hre.artifacts.readArtifact('contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter');
  const abiHash = createHash('sha256').update(JSON.stringify(artifact.abi)).digest('hex');

  // Store in database
  await storeContractInDatabase(
    proxyAddress,
    'RWAMarketplaceUpgradeableSetter',
    'MARKETPLACE',
    marketplaceProxy.deploymentTransaction()?.hash || '',
    deployer.address,
    abiHash,
    true,
    'UUPS',
    implAddress
  );

  // Store ABI
  await storeABIInDatabase(proxyAddress, artifact.abi);

  // Verify on Etherscan
  console.log("\n   🔍 Verifying on Etherscan...");
  await verifyContractOnEtherscan(implAddress, 'RWAMarketplaceUpgradeableSetter', []);

  return { proxy: proxyAddress, implementation: implAddress };
}

/**
 * Step 5: Configure Roles and Permissions
 */
async function configureRoles(
  registry: any,
  factory: any,
  factory404: any,
  marketplaceAddress: string
): Promise<void> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   STEP 5: Configure Roles and Permissions                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Grant MARKETPLACE_ROLE to marketplace on registry
  console.log("   ⚙️  Granting MARKETPLACE_ROLE to marketplace on registry...");
  const MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
  const grantMarketplaceRoleTx = await registry.grantRole(MARKETPLACE_ROLE, marketplaceAddress);
  await grantMarketplaceRoleTx.wait();
  console.log("   ✅ MARKETPLACE_ROLE granted on registry\n");

  // Grant TOKEN_CREATOR_ROLE to marketplace on factory
  console.log("   ⚙️  Granting TOKEN_CREATOR_ROLE to marketplace on factory...");
  const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
  const grantTokenCreatorRoleTx = await factory.grantRole(TOKEN_CREATOR_ROLE, marketplaceAddress);
  await grantTokenCreatorRoleTx.wait();
  console.log("   ✅ TOKEN_CREATOR_ROLE granted on factory\n");

  // Grant TOKEN_CREATOR_ROLE to marketplace on factory404
  console.log("   ⚙️  Granting TOKEN_CREATOR_ROLE to marketplace on factory404...");
  const TOKEN_CREATOR_ROLE_404 = await factory404.TOKEN_CREATOR_ROLE();
  const grantTokenCreatorRole404Tx = await factory404.grantRole(TOKEN_CREATOR_ROLE_404, marketplaceAddress);
  await grantTokenCreatorRole404Tx.wait();
  console.log("   ✅ TOKEN_CREATOR_ROLE granted on factory404\n");

  console.log("   ✅ All roles configured successfully!");
}

/**
 * Step 6: Verify Complete Deployment
 */
async function verifyDeployment(
  registry: any,
  factory: any,
  factory404: any,
  marketplace: any,
  deployer: any
): Promise<void> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   STEP 6: Verify Complete Deployment                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Verify registry
  console.log("   🔍 Verifying Registry...");
  const registryAdmin = await registry.hasRole(ethers.ZeroHash, deployer.address);
  console.log(`      Admin role: ${registryAdmin ? '✅' : '❌'}`);

  // Verify factory
  console.log("\n   🔍 Verifying Factory...");
  const factoryAdmin = await factory.hasRole(ethers.ZeroHash, deployer.address);
  console.log(`      Admin role: ${factoryAdmin ? '✅' : '❌'}`);

  // Verify factory404
  console.log("\n   🔍 Verifying Factory404...");
  const factory404Owner = await factory404.owner();
  console.log(`      Owner: ${factory404Owner === deployer.address ? '✅' : '❌'}`);

  // Verify marketplace
  console.log("\n   🔍 Verifying Marketplace...");
  const marketplaceRegistry = await marketplace.assetRegistry();
  const marketplaceFee = await marketplace.getMarketplaceFee();
  const marketplaceFactory404 = await marketplace.getTokenFactory404();
  const marketplacePaused = await marketplace.paused();

  console.log(`      Asset Registry: ${marketplaceRegistry === await registry.getAddress() ? '✅' : '❌'}`);
  console.log(`      Marketplace Fee: ${marketplaceFee.toString() === '250' ? '✅' : '❌'} (${marketplaceFee} bps)`);
  console.log(`      Factory404: ${marketplaceFactory404 === await factory404.getAddress() ? '✅' : '❌'}`);
  console.log(`      Paused: ${marketplacePaused ? '❌ (Should be unpaused!)' : '✅'}`);

  console.log("\n   ✅ Deployment verification complete!");
}

/**
 * Step 7: Generate Deployment Summary
 */
async function generateDeploymentSummary(state: DeploymentState): Promise<void> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOYMENT SUMMARY                                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 Deployed Contracts:\n");
  console.log(`   Registry Proxy:              ${state.registry.proxy}`);
  console.log(`   Registry Implementation:     ${state.registry.implementation}`);
  console.log(`   Factory Proxy:               ${state.factory.proxy}`);
  console.log(`   Factory Implementation:      ${state.factory.implementation}`);
  console.log(`   Factory404:                  ${state.factory404.address}`);
  console.log(`   Marketplace Proxy:           ${state.marketplace.proxy}`);
  console.log(`   Marketplace Implementation:  ${state.marketplace.implementation}`);

  console.log("\n🔗 Etherscan Links:\n");
  console.log(`   Registry:     https://sepolia.etherscan.io/address/${state.registry.proxy}`);
  console.log(`   Factory:      https://sepolia.etherscan.io/address/${state.factory.proxy}`);
  console.log(`   Factory404:   https://sepolia.etherscan.io/address/${state.factory404.address}`);
  console.log(`   Marketplace:  https://sepolia.etherscan.io/address/${state.marketplace.proxy}`);

  console.log("\n✅ Verification Status:\n");
  console.log(`   Registry:     ${state.verifiedOnEtherscan.registry ? '✅' : '⏳'}`);
  console.log(`   Factory:      ${state.verifiedOnEtherscan.factory ? '✅' : '⏳'}`);
  console.log(`   Factory404:   ${state.verifiedOnEtherscan.factory404 ? '✅' : '⏳'}`);
  console.log(`   Marketplace:  ${state.verifiedOnEtherscan.marketplace ? '✅' : '⏳'}`);

  console.log("\n✅ Database Storage:\n");
  console.log(`   Registry ABI:     ${state.registry.abiStored ? '✅' : '❌'}`);
  console.log(`   Factory ABI:      ${state.factory.abiStored ? '✅' : '❌'}`);
  console.log(`   Factory404 ABI:   ${state.factory404.abiStored ? '✅' : '❌'}`);
  console.log(`   Marketplace ABI:  ${state.marketplace.abiStored ? '✅' : '❌'}`);

  console.log("\n✅ Roles Configured:\n");
  console.log(`   Registry MARKETPLACE_ROLE:    ${state.rolesConfigured.registryMarketplaceRole ? '✅' : '❌'}`);
  console.log(`   Factory TOKEN_CREATOR_ROLE:   ${state.rolesConfigured.factoryTokenCreatorRole ? '✅' : '❌'}`);
  console.log(`   Factory404 TOKEN_CREATOR_ROLE: ${state.rolesConfigured.factory404TokenCreatorRole ? '✅' : '❌'}`);

  console.log("\n📝 Environment Variables:\n");
  console.log(`   NEXT_PUBLIC_RWA_ASSET_REGISTRY=${state.registry.proxy}`);
  console.log(`   NEXT_PUBLIC_RWA_TOKEN_FACTORY=${state.factory.proxy}`);
  console.log(`   NEXT_PUBLIC_RWA_TOKEN_FACTORY_404=${state.factory404.address}`);
  console.log(`   NEXT_PUBLIC_RWA_MARKETPLACE=${state.marketplace.proxy}`);

  // Save to file
  const summaryPath = path.join(__dirname, '../deployment-summary-fresh.json');
  fs.writeFileSync(summaryPath, JSON.stringify(state, null, 2));
  console.log(`\n💾 Deployment summary saved to: ${summaryPath}`);
}

/**
 * Main deployment function
 */
async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   COMPLETE FRESH ECOSYSTEM DEPLOYMENT                      ║");
  console.log("║   Using Latest Contract Versions with All Fixes           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  const state: DeploymentState = {
    registry: { proxy: '', implementation: '', abiStored: false },
    factory: { proxy: '', implementation: '', abiStored: false },
    factory404: { address: '', abiStored: false },
    marketplace: { proxy: '', implementation: '', abiStored: false },
    rolesConfigured: {
      registryMarketplaceRole: false,
      factoryTokenCreatorRole: false,
      factory404TokenCreatorRole: false,
    },
    verifiedOnEtherscan: {
      registry: false,
      factory: false,
      factory404: false,
      marketplace: false,
    },
  };

  try {
    // Step 1: Deploy Registry
    const registry = await deployRegistry(deployer);
    state.registry.proxy = registry.proxy;
    state.registry.implementation = registry.implementation;
    state.registry.abiStored = true;
    state.verifiedOnEtherscan.registry = true;

    // Step 2: Deploy Factory
    const factory = await deployFactory(deployer);
    state.factory.proxy = factory.proxy;
    state.factory.implementation = factory.implementation;
    state.factory.abiStored = true;
    state.verifiedOnEtherscan.factory = true;

    // Step 3: Deploy Factory404
    const factory404Address = await deployFactory404(deployer);
    state.factory404.address = factory404Address;
    state.factory404.abiStored = true;
    state.verifiedOnEtherscan.factory404 = true;

    // Step 4: Deploy Marketplace
    const marketplace = await deployMarketplace(
      deployer,
      registry.proxy,
      factory.proxy,
      factory404Address
    );
    state.marketplace.proxy = marketplace.proxy;
    state.marketplace.implementation = marketplace.implementation;
    state.marketplace.abiStored = true;
    state.verifiedOnEtherscan.marketplace = true;

    // Get contract instances for role configuration
    const registryContract = await ethers.getContractAt('RWAAssetRegistryUpgradeable', registry.proxy);
    const factoryContract = await ethers.getContractAt('RWATokenFactoryUpgradeable', factory.proxy);
    const factory404Contract = await ethers.getContractAt('RWATokenFactory404Fixed', factory404Address);
    const marketplaceContract = await ethers.getContractAt('RWAMarketplaceUpgradeableSetter', marketplace.proxy);

    // Step 5: Configure Roles
    await configureRoles(
      registryContract,
      factoryContract,
      factory404Contract,
      marketplace.proxy
    );
    state.rolesConfigured.registryMarketplaceRole = true;
    state.rolesConfigured.factoryTokenCreatorRole = true;
    state.rolesConfigured.factory404TokenCreatorRole = true;

    // Step 6: Verify Deployment
    await verifyDeployment(
      registryContract,
      factoryContract,
      factory404Contract,
      marketplaceContract,
      deployer
    );

    // Step 7: Generate Summary
    await generateDeploymentSummary(state);

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║   ✅ DEPLOYMENT COMPLETED SUCCESSFULLY!                    ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("📋 Next Steps:\n");
    console.log("   1. Update .env.local with new contract addresses (see above)");
    console.log("   2. Register properties in the registry");
    console.log("   3. Deploy ERC404 tokens for properties");
    console.log("   4. Create marketplace listings\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
