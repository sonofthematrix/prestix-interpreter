/**
 * Upgradeable Factory Deployment Script
 * Deploys factory contracts with upgrade capability for Tiger Palace Pro
 * 
 * Usage: bun hardhat run scripts/deploy-upgradeable-factory.ts --network sepolia
 */

import { ethers } from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import * as fs from 'fs';
import * as path from 'path';

// upgrades is available globally via hardhat runtime environment
declare const upgrades: any;

async function main() {
    console.log("🚀 Starting Upgradeable Factory Deployment...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📍 Deploying contracts with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Deployment configuration
    const FEE_RECIPIENT = process.env.FEE_RECIPIENT || deployer.address;
    const MARKETPLACE_FEE_BPS = 250; // 2.5%

    // ========================================================================
    // 1. Deploy RWA Asset Registry (Upgradeable)
    // ========================================================================
    console.log("📝 Deploying RWAAssetRegistry (Upgradeable)...");
    const RWAAssetRegistry = await ethers.getContractFactory("RWAAssetRegistry");
    const assetRegistry = await upgrades.deployProxy(
        RWAAssetRegistry,
        [],
        { 
            initializer: 'initialize',
            kind: 'uups'
        }
    );
    await assetRegistry.waitForDeployment();
    const assetRegistryAddress = await assetRegistry.getAddress();
    console.log("✅ RWAAssetRegistry deployed to:", assetRegistryAddress);
    console.log("   Implementation:", await upgrades.erc1967.getImplementationAddress(assetRegistryAddress));
    console.log("   Admin:", await upgrades.erc1967.getAdminAddress(assetRegistryAddress), "\n");

    // ========================================================================
    // 2. Deploy RWA Token Factory (Upgradeable)
    // ========================================================================
    console.log("📝 Deploying RWATokenFactory (Upgradeable)...");
    const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
    const tokenFactory = await upgrades.deployProxy(
        RWATokenFactory,
        [assetRegistryAddress],
        { 
            initializer: 'initialize',
            kind: 'uups'
        }
    );
    await tokenFactory.waitForDeployment();
    const tokenFactoryAddress = await tokenFactory.getAddress();
    console.log("✅ RWATokenFactory deployed to:", tokenFactoryAddress);
    console.log("   Implementation:", await upgrades.erc1967.getImplementationAddress(tokenFactoryAddress));
    console.log("   Admin:", await upgrades.erc1967.getAdminAddress(tokenFactoryAddress), "\n");

    // ========================================================================
    // 3. Deploy RWA Marketplace (Upgradeable)
    // ========================================================================
    console.log("📝 Deploying RWAMarketplace (Upgradeable)...");
    const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");
    const marketplace = await upgrades.deployProxy(
        RWAMarketplace,
        [assetRegistryAddress, FEE_RECIPIENT, MARKETPLACE_FEE_BPS],
        { 
            initializer: 'initialize',
            kind: 'uups'
        }
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ RWAMarketplace deployed to:", marketplaceAddress);
    console.log("   Implementation:", await upgrades.erc1967.getImplementationAddress(marketplaceAddress));
    console.log("   Admin:", await upgrades.erc1967.getAdminAddress(marketplaceAddress));
    console.log("   Fee Recipient:", FEE_RECIPIENT);
    console.log("   Fee:", MARKETPLACE_FEE_BPS / 100, "%\n");

    // ========================================================================
    // 4. Deploy Membership System (Upgradeable)
    // ========================================================================
    console.log("📝 Deploying MembershipSystem (Upgradeable)...");
    const MembershipSystem = await ethers.getContractFactory("MembershipSystem");
    const membershipSystem = await upgrades.deployProxy(
        MembershipSystem,
        [],
        { 
            initializer: 'initialize',
            kind: 'uups'
        }
    );
    await membershipSystem.waitForDeployment();
    const membershipSystemAddress = await membershipSystem.getAddress();
    console.log("✅ MembershipSystem deployed to:", membershipSystemAddress);
    console.log("   Implementation:", await upgrades.erc1967.getImplementationAddress(membershipSystemAddress));
    console.log("   Admin:", await upgrades.erc1967.getAdminAddress(membershipSystemAddress), "\n");

    // ========================================================================
    // 5. Setup Permissions
    // ========================================================================
    console.log("🔐 Setting up permissions...");
    
    // Grant MINTER_ROLE to tokenFactory in assetRegistry
    const MINTER_ROLE = await assetRegistry.MINTER_ROLE();
    const tx1 = await assetRegistry.grantRole(MINTER_ROLE, tokenFactoryAddress);
    await tx1.wait();
    console.log("✅ Granted MINTER_ROLE to TokenFactory");

    // Grant OPERATOR_ROLE to marketplace
    const OPERATOR_ROLE = await assetRegistry.OPERATOR_ROLE();
    const tx2 = await assetRegistry.grantRole(OPERATOR_ROLE, marketplaceAddress);
    await tx2.wait();
    console.log("✅ Granted OPERATOR_ROLE to Marketplace\n");

    // ========================================================================
    // 6. Verify Network and Block
    // ========================================================================
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    
    console.log("📊 Deployment Summary:");
    console.log("   Network:", network.name);
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   Block Number:", blockNumber);
    console.log("   Deployer:", deployer.address);

    // ========================================================================
    // 7. Save Deployment Info
    // ========================================================================
    const deployment = {
        network: network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            RWAAssetRegistry: {
                proxy: assetRegistryAddress,
                implementation: await upgrades.erc1967.getImplementationAddress(assetRegistryAddress),
                admin: await upgrades.erc1967.getAdminAddress(assetRegistryAddress)
            },
            RWATokenFactory: {
                proxy: tokenFactoryAddress,
                implementation: await upgrades.erc1967.getImplementationAddress(tokenFactoryAddress),
                admin: await upgrades.erc1967.getAdminAddress(tokenFactoryAddress)
            },
            RWAMarketplace: {
                proxy: marketplaceAddress,
                implementation: await upgrades.erc1967.getImplementationAddress(marketplaceAddress),
                admin: await upgrades.erc1967.getAdminAddress(marketplaceAddress),
                feeRecipient: FEE_RECIPIENT,
                feeBps: MARKETPLACE_FEE_BPS
            },
            MembershipSystem: {
                proxy: membershipSystemAddress,
                implementation: await upgrades.erc1967.getImplementationAddress(membershipSystemAddress),
                admin: await upgrades.erc1967.getAdminAddress(membershipSystemAddress)
            }
        }
    };

    // Save to deployments folder
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${network.name}-upgradeable.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log("\n📄 Deployment info saved to:", deploymentFile);

    // ========================================================================
    // 8. Copy ABIs to Application
    // ========================================================================
    console.log("\n📋 Copying ABIs to application...");
    await copyABIsToApp();

    // ========================================================================
    // 9. Generate Environment Variables
    // ========================================================================
    console.log("\n🔧 Environment Variables for .env.local:");
    console.log("----------------------------------------");
    console.log(`RWA_ASSET_REGISTRY=${assetRegistryAddress}`);
    console.log(`RWA_TOKEN_FACTORY=${tokenFactoryAddress}`);
    console.log(`RWA_MARKETPLACE=${marketplaceAddress}`);
    console.log(`MEMBERSHIP_SYSTEM=${membershipSystemAddress}`);
    console.log(`ADMIN_WALLET_ADDRESS=${deployer.address}`);
    console.log(`SEPOLIA_RPC_URL=${process.env.SEPOLIA_URL || 'https://sepolia.infura.io/v3/YOUR_KEY'}`);
    console.log(`ENABLE_BLOCKCHAIN_SYNC=true`);
    console.log("----------------------------------------\n");

    console.log("✅ Deployment Complete!");
    console.log("🔗 Explorer URLs:");
    const explorerBase = network.chainId.toString() === '11155111' 
        ? 'https://sepolia.etherscan.io'
        : 'https://etherscan.io';
    console.log(`   Asset Registry: ${explorerBase}/address/${assetRegistryAddress}`);
    console.log(`   Token Factory: ${explorerBase}/address/${tokenFactoryAddress}`);
    console.log(`   Marketplace: ${explorerBase}/address/${marketplaceAddress}`);
    console.log(`   Membership: ${explorerBase}/address/${membershipSystemAddress}\n`);
}

/**
 * Copy ABIs to main application for frontend integration
 */
async function copyABIsToApp() {
    const artifactsDir = path.join(__dirname, '../artifacts/contracts');
    const appABIsDir = path.join(__dirname, '../../lib/abis');

    // Create ABIs directory if it doesn't exist
    if (!fs.existsSync(appABIsDir)) {
        fs.mkdirSync(appABIsDir, { recursive: true });
    }

    const contracts = [
        { path: 'core/RWAAssetRegistry.sol', name: 'RWAAssetRegistry' },
        { path: 'core/RWAToken.sol', name: 'RWAToken' },
        { path: 'core/RWATokenFactory.sol', name: 'RWATokenFactory' },
        { path: 'marketplace/RWAMarketplace.sol', name: 'RWAMarketplace' },
        { path: 'membership/MembershipSystem.sol', name: 'MembershipSystem' }
    ];

    for (const contract of contracts) {
        const sourcePath = path.join(artifactsDir, contract.path, `${contract.name}.json`);
        const destPath = path.join(appABIsDir, `${contract.name}.json`);

        if (fs.existsSync(sourcePath)) {
            const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
            // Only save ABI and bytecode
            const abiData = {
                abi: artifact.abi,
                bytecode: artifact.bytecode,
                contractName: contract.name
            };
            fs.writeFileSync(destPath, JSON.stringify(abiData, null, 2));
            console.log(`   ✅ Copied ${contract.name} ABI`);
        }
    }
}

/**
 * Upgrade existing contracts (for future use)
 */
export async function upgradeContracts() {
    console.log("🔄 Upgrading contracts...");

    // Load deployment addresses
    const network = await ethers.provider.getNetwork();
    const deploymentFile = path.join(__dirname, `../deployments/${network.name}-upgradeable.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        throw new Error("No deployment found for this network");
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

    // Upgrade Asset Registry
    console.log("Upgrading RWAAssetRegistry...");
    const RWAAssetRegistryV2 = await ethers.getContractFactory("RWAAssetRegistry");
    const upgradedRegistry = await upgrades.upgradeProxy(
        deployment.contracts.RWAAssetRegistry.proxy,
        RWAAssetRegistryV2
    );
    await upgradedRegistry.waitForDeployment();
    console.log("✅ RWAAssetRegistry upgraded");

    // Upgrade Token Factory
    console.log("Upgrading RWATokenFactory...");
    const RWATokenFactoryV2 = await ethers.getContractFactory("RWATokenFactory");
    const upgradedFactory = await upgrades.upgradeProxy(
        deployment.contracts.RWATokenFactory.proxy,
        RWATokenFactoryV2
    );
    await upgradedFactory.waitForDeployment();
    console.log("✅ RWATokenFactory upgraded");

    console.log("✅ All contracts upgraded successfully!");
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });

