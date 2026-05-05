/**
 * Comprehensive Upgradeable Ecosystem Deployment Script
 * 
 * Deploys all Tiger Palace RWA contracts as upgradeable proxies:
 * - TigerPalaceTokenUpgradeable
 * - RWARewardDistributorUpgradeable
 * - RWARevenueUpgradeable
 * - RWAStakingUpgradeable
 * 
 * Exports ABIs and addresses for frontend integration
 * 
 * Usage: bun hardhat run scripts/deploy-upgradeable-ecosystem.ts --network sepolia
 */

import { ethers, upgrades, network } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentResult {
  network: string;
  timestamp: string;
  contracts: {
    [key: string]: {
      proxy: string;
      implementation: string;
      admin?: string;
    };
  };
  abis: {
    [key: string]: any;
  };
}

async function main() {
  console.log("\n🚀 Deploying Tiger Palace RWA Ecosystem (Upgradeable Proxies)");
  console.log("=" .repeat(70));
  console.log(`Network: ${network.name}`);
  
  const [deployer, treasury] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Treasury: ${treasury.address}`);
  
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(deployerBalance)} ETH\n`);

  const result: DeploymentResult = {
    network: network.name,
    timestamp: new Date().toISOString(),
    contracts: {},
    abis: {}
  };

  try {
    // Step 1: Deploy TigerPalaceTokenUpgradeable
    console.log("📦 Step 1: Deploying TigerPalaceTokenUpgradeable...");
    const TigerPalaceTokenUpgradeable = await ethers.getContractFactory("TigerPalaceTokenUpgradeable");
    const tokenizinToken = await upgrades.deployProxy(
      TigerPalaceTokenUpgradeable,
      [
        deployer.address, // owner/admin
        treasury.address, // treasury
        ethers.parseEther("1000000") // initial supply (1M tokens)
      ],
      {
        kind: "transparent",
        initializer: "initialize"
      }
    );
    await tokenizinToken.waitForDeployment();
    
    const tokenProxyAddress = await tokenizinToken.getAddress();
    const tokenImplAddress = await upgrades.erc1967.getImplementationAddress(tokenProxyAddress);
    const tokenAdminAddress = await upgrades.erc1967.getAdminAddress(tokenProxyAddress);
    
    console.log(`✅ TigerPalaceToken Proxy: ${tokenProxyAddress}`);
    console.log(`   Implementation: ${tokenImplAddress}`);
    console.log(`   Admin: ${tokenAdminAddress}\n`);
    
    result.contracts.TigerPalaceToken = {
      proxy: tokenProxyAddress,
      implementation: tokenImplAddress,
      admin: tokenAdminAddress
    };

    // Step 2: Deploy RWARewardDistributorUpgradeable
    console.log("📦 Step 2: Deploying RWARewardDistributorUpgradeable...");
    const RWARewardDistributorUpgradeable = await ethers.getContractFactory("RWARewardDistributorUpgradeable");
    const rewardDistributor = await upgrades.deployProxy(
      RWARewardDistributorUpgradeable,
      [
        tokenProxyAddress, // token address
        treasury.address, // treasury
        ethers.parseEther("1000"), // initial reward pool
        deployer.address // admin
      ],
      {
        kind: "transparent",
        initializer: "initialize"
      }
    );
    await rewardDistributor.waitForDeployment();
    
    const distributorProxyAddress = await rewardDistributor.getAddress();
    const distributorImplAddress = await upgrades.erc1967.getImplementationAddress(distributorProxyAddress);
    const distributorAdminAddress = await upgrades.erc1967.getAdminAddress(distributorProxyAddress);
    
    console.log(`✅ RWARewardDistributor Proxy: ${distributorProxyAddress}`);
    console.log(`   Implementation: ${distributorImplAddress}`);
    console.log(`   Admin: ${distributorAdminAddress}\n`);
    
    result.contracts.RWARewardDistributor = {
      proxy: distributorProxyAddress,
      implementation: distributorImplAddress,
      admin: distributorAdminAddress
    };

    // Step 3: Deploy RWARevenueUpgradeable
    console.log("📦 Step 3: Deploying RWARevenueUpgradeable...");
    const RWARevenueUpgradeable = await ethers.getContractFactory("RWARevenueUpgradeable");
    const rwaRevenue = await upgrades.deployProxy(
      RWARevenueUpgradeable,
      [
        tokenProxyAddress, // token address
        distributorProxyAddress, // reward distributor
        deployer.address // admin
      ],
      {
        kind: "transparent",
        initializer: "initialize"
      }
    );
    await rwaRevenue.waitForDeployment();
    
    const revenueProxyAddress = await rwaRevenue.getAddress();
    const revenueImplAddress = await upgrades.erc1967.getImplementationAddress(revenueProxyAddress);
    const revenueAdminAddress = await upgrades.erc1967.getAdminAddress(revenueProxyAddress);
    
    console.log(`✅ RWARevenue Proxy: ${revenueProxyAddress}`);
    console.log(`   Implementation: ${revenueImplAddress}`);
    console.log(`   Admin: ${revenueAdminAddress}\n`);
    
    result.contracts.RWARevenue = {
      proxy: revenueProxyAddress,
      implementation: revenueImplAddress,
      admin: revenueAdminAddress
    };

    // Step 4: Deploy RWAStakingUpgradeable
    console.log("📦 Step 4: Deploying RWAStakingUpgradeable...");
    const RWAStakingUpgradeable = await ethers.getContractFactory("RWAStakingUpgradeable");
    const TigerStaking = await upgrades.deployProxy(
      RWAStakingUpgradeable,
      [
        tokenProxyAddress, // token address
        revenueProxyAddress, // revenue address
        distributorProxyAddress, // reward distributor
        deployer.address // admin
      ],
      {
        kind: "transparent",
        initializer: "initialize"
      }
    );
    await TigerStaking.waitForDeployment();
    
    const stakingProxyAddress = await TigerStaking.getAddress();
    const stakingImplAddress = await upgrades.erc1967.getImplementationAddress(stakingProxyAddress);
    const stakingAdminAddress = await upgrades.erc1967.getAdminAddress(stakingProxyAddress);
    
    console.log(`✅ RWAStaking Proxy: ${stakingProxyAddress}`);
    console.log(`   Implementation: ${stakingImplAddress}`);
    console.log(`   Admin: ${stakingAdminAddress}\n`);
    
    result.contracts.RWAStaking = {
      proxy: stakingProxyAddress,
      implementation: stakingImplAddress,
      admin: stakingAdminAddress
    };

    // Step 5: Configure contract relationships
    console.log("🔧 Step 5: Configuring contract relationships...");
    
    // Set RWAStaking address in RWARevenue
    const setStakingTx = await rwaRevenue.setRwaStaking(stakingProxyAddress);
    await setStakingTx.wait();
    console.log("✅ Set RWAStaking address in RWARevenue");
    
    // Set contract addresses in RWARewardDistributor
    const setAddressesTx = await rewardDistributor.setContractAddresses(
      stakingProxyAddress,
      revenueProxyAddress,
      treasury.address
    );
    await setAddressesTx.wait();
    console.log("✅ Set contract addresses in RWARewardDistributor");
    
    // Configure token exemptions
    const exemptDistributorTx = await tokenizinToken.setTaxExemption(
      distributorProxyAddress,
      true
    );
    await exemptDistributorTx.wait();
    console.log("✅ Exempted RWARewardDistributor from taxes");
    
    const exemptStakingTx = await tokenizinToken.setTaxExemption(
      stakingProxyAddress,
      true
    );
    await exemptStakingTx.wait();
    console.log("✅ Exempted RWAStaking from taxes");
    
    // Fund reward distributor
    const fundTx = await tokenizinToken.transfer(
      distributorProxyAddress,
      ethers.parseEther("100000") // 100K tokens
    );
    await fundTx.wait();
    console.log("✅ Funded RWARewardDistributor with 100K tokens\n");

    // Step 6: Export ABIs
    console.log("📄 Step 6: Exporting ABIs...");
    
    const abiDir = path.join(__dirname, "../abis");
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }
    
    const contractNames = [
      "TigerPalaceTokenUpgradeable",
      "RWARewardDistributorUpgradeable",
      "RWARevenueUpgradeable",
      "RWAStakingUpgradeable"
    ];
    
    for (const contractName of contractNames) {
      const artifactPath = path.join(
        __dirname,
        `../artifacts/contracts/upgradeable/${contractName}.sol/${contractName}.json`
      );
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        result.abis[contractName] = artifact.abi;
        
        // Save ABI to abis directory
        const abiPath = path.join(abiDir, `${contractName}.json`);
        fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
        console.log(`✅ Exported ABI: ${contractName}`);
      } else {
        console.log(`⚠️  ABI not found: ${contractName}`);
      }
    }

    // Step 7: Save deployment results
    console.log("\n💾 Step 7: Saving deployment results...");
    
    const deploymentFile = path.join(__dirname, "../deployed-addresses-upgradeable.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(result, null, 2));
    console.log(`✅ Saved deployment addresses to: ${deploymentFile}`);

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(70));
    console.log("\n📋 Proxy Addresses (Use these for frontend integration):");
    console.log(`• TigerPalaceToken: ${tokenProxyAddress}`);
    console.log(`• RWARewardDistributor: ${distributorProxyAddress}`);
    console.log(`• RWARevenue: ${revenueProxyAddress}`);
    console.log(`• RWAStaking: ${stakingProxyAddress}`);
    console.log("\n📋 ABIs exported to: smart-contracts/abis/");
    console.log("\n✅ All contracts deployed as upgradeable proxies");
    console.log("✅ Contract relationships configured");
    console.log("✅ ABIs exported for frontend integration");
    console.log("\n" + "=".repeat(70));

  } catch (error: any) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

