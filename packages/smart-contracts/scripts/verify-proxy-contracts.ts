/**
 * Verify Proxy Contracts Script
 * 
 * Verifies all TransparentUpgradeableProxy contracts deployed on Sepolia.
 * Reads from deployed-addresses-proxy.json and verifies:
 * - All proxy contracts (TransparentUpgradeableProxy)
 * - Checks implementation contract verification status
 * 
 * Usage: bun hardhat run scripts/verify-proxy-contracts.ts --network sepolia
 */

import "dotenv/config";
import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentAddresses {
  network: string;
  addresses: {
    ProxyAdmin: string;
    TigerPalaceToken?: string;
    RWAAssetRegistry: string;
    RWATokenFactory: string;
    RWATokenFactory404?: string;
    RWAMarketplace: string;
    RWAStaking: string;
    RWARewardDistributor: string;
    RWARevenue: string;
    MembershipSystem: string;
    RWAAssetRegistry_Implementation: string;
    RWATokenFactory_Implementation: string;
    RWAMarketplace_Implementation: string;
    RWAStaking_Implementation: string;
    MembershipSystem_Implementation: string;
  };
}

interface VerificationResult {
  contractName: string;
  proxyAddress: string;
  implementationAddress: string;
  adminAddress: string;
  proxyVerified: boolean;
  implementationVerified: boolean;
  error?: string;
  etherscanUrl: string;
}

/**
 * Get implementation address from proxy using ERC1967 storage slot
 */
async function getImplementationAddress(proxyAddress: string): Promise<string | null> {
  try {
    // Try using upgrades plugin first
    try {
      const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      if (implAddress && implAddress !== ethers.ZeroAddress) {
        return implAddress;
      }
    } catch (error) {
      // Fallback to storage slot
    }

    // Fallback: Read from ERC1967 storage slot
    const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const storageValue = await ethers.provider.getStorage(proxyAddress, implementationSlot);
    
    if (storageValue && storageValue !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      const addressHex = storageValue.slice(-40);
      return ethers.getAddress("0x" + addressHex);
    }
    
    return null;
  } catch (error: any) {
    console.log(`⚠️  Error getting implementation address: ${error.message}`);
    return null;
  }
}

/**
 * Get admin address from proxy using ERC1967 storage slot
 */
async function getAdminAddress(proxyAddress: string): Promise<string | null> {
  try {
    // Try using ProxyAdmin contract if available
    try {
      const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
      if (adminAddress && adminAddress !== ethers.ZeroAddress) {
        return adminAddress;
      }
    } catch (error) {
      // Fallback to storage slot
    }

    // Fallback: Read from ERC1967 storage slot
    const adminSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
    const storageValue = await ethers.provider.getStorage(proxyAddress, adminSlot);
    
    if (storageValue && storageValue !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      const addressHex = storageValue.slice(-40);
      return ethers.getAddress("0x" + addressHex);
    }
    
    return null;
  } catch (error: any) {
    console.log(`⚠️  Error getting admin address: ${error.message}`);
    return null;
  }
}

/**
 * Check if contract is verified on Etherscan
 */
async function isContractVerified(address: string): Promise<boolean> {
  try {
    // Try to verify - if it says "already verified", it's verified
    // We'll use a simple check by trying to get contract code
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      return false;
    }
    
    // For a more accurate check, we'd need to call Etherscan API
    // For now, we'll try verification and catch "already verified" errors
    return false; // Will be determined during actual verification
  } catch (error) {
    return false;
  }
}

/**
 * Verify implementation contract
 */
async function verifyImplementation(
  address: string,
  contractPath: string,
  contractName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n📤 Verifying ${contractName} Implementation...`);
    console.log(`   Address: ${address}`);
    console.log(`   Contract: ${contractPath}`);
    
    await hre.run("verify:verify", {
      address: address,
      contract: contractPath,
      constructorArguments: [],
    });
    
    console.log(`✅ ${contractName} Implementation verified successfully!`);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    if (
      errorMessage.includes("Already Verified") ||
      errorMessage.includes("already verified") ||
      errorMessage.includes("Contract source code already verified")
    ) {
      console.log(`✅ ${contractName} Implementation already verified`);
      return { success: true };
    } else {
      console.log(`❌ Implementation verification failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Get initialization data for proxy contract
 */
async function getInitData(
  contractName: string,
  implementationAddress: string,
  proxyAddress: string
): Promise<string> {
  try {
    // Try to get the initialization data from the proxy's constructor
    // For TransparentUpgradeableProxy, the init data is passed in constructor
    // We need to check if the contract was initialized
    
    // For most contracts, we can try to encode the initialize function
    const contractFactory = await ethers.getContractFactory(contractName);
    const iface = contractFactory.interface;
    
    // Check if contract has initialize function
    if (iface.hasFunction("initialize")) {
      // Try to get current values to encode proper init data
      // For now, we'll use empty data if we can't determine it
      // Etherscan can often auto-detect proxy patterns without init data
      return "0x";
    }
    
    return "0x";
  } catch (error) {
    console.log(`⚠️  Could not determine init data for ${contractName}, using empty`);
    return "0x";
  }
}

/**
 * Verify proxy contract
 */
async function verifyProxy(
  proxyAddress: string,
  implementationAddress: string,
  adminAddress: string,
  initData: string,
  contractName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n📤 Verifying ${contractName} Proxy...`);
    console.log(`   Proxy Address: ${proxyAddress}`);
    console.log(`   Implementation: ${implementationAddress}`);
    console.log(`   Admin: ${adminAddress}`);
    console.log(`   Init Data: ${initData === "0x" ? "empty" : initData.slice(0, 20) + "..."}`);
    
    // TransparentUpgradeableProxy constructor: (address _logic, address admin_, bytes memory _data)
    await hre.run("verify:verify", {
      address: proxyAddress,
      contract: "contracts/proxy/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
      constructorArguments: [implementationAddress, adminAddress, initData],
    });
    
    console.log(`✅ ${contractName} Proxy verified successfully!`);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    if (
      errorMessage.includes("Already Verified") ||
      errorMessage.includes("already verified") ||
      errorMessage.includes("Contract source code already verified")
    ) {
      console.log(`✅ ${contractName} Proxy already verified`);
      return { success: true };
    } else {
      // Try without init data (Etherscan can sometimes auto-detect)
      if (initData !== "0x") {
        try {
          console.log(`⚠️  Retrying without init data...`);
          await hre.run("verify:verify", {
            address: proxyAddress,
            contract: "contracts/proxy/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
            constructorArguments: [implementationAddress, adminAddress, "0x"],
          });
          console.log(`✅ ${contractName} Proxy verified (without init data)!`);
          return { success: true };
        } catch (retryError: any) {
          console.log(`⚠️  Proxy verification failed: ${errorMessage}`);
          console.log(`   Note: OpenZeppelin proxies are often pre-verified on Etherscan`);
          return { success: false, error: errorMessage };
        }
      } else {
        console.log(`⚠️  Proxy verification failed: ${errorMessage}`);
        console.log(`   Note: OpenZeppelin proxies are often pre-verified on Etherscan`);
        return { success: false, error: errorMessage };
      }
    }
  }
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   PROXY CONTRACT VERIFICATION                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  // Check Etherscan API key
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  if (!etherscanApiKey) {
    console.log("❌ Error: ETHERSCAN_API_KEY not set");
    console.log("   Set it in your .env.local or .env file");
    process.exit(1);
  }
  
  // Load deployment addresses
  const addressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
  if (!fs.existsSync(addressesFile)) {
    console.log(`❌ Error: Deployment file not found: ${addressesFile}`);
    process.exit(1);
  }
  
  const deployment: DeploymentAddresses = JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
  const network = await ethers.provider.getNetwork();
  
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`📋 Deployment Network: ${deployment.network}\n`);
  
  const results: VerificationResult[] = [];
  
  // Define proxy contracts to verify
  const proxyContracts = [
    {
      name: "RWAAssetRegistry",
      proxyAddress: deployment.addresses.RWAAssetRegistry,
      implementationAddress: deployment.addresses.RWAAssetRegistry_Implementation,
      contractPath: "contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
      contractName: "RWAAssetRegistryUpgradeable",
    },
    {
      name: "RWATokenFactory",
      proxyAddress: deployment.addresses.RWATokenFactory,
      implementationAddress: deployment.addresses.RWATokenFactory_Implementation,
      contractPath: "contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable",
      contractName: "RWATokenFactoryUpgradeable",
    },
    {
      name: "RWAMarketplace",
      proxyAddress: deployment.addresses.RWAMarketplace,
      implementationAddress: deployment.addresses.RWAMarketplace_Implementation,
      contractPath: "contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable",
      contractName: "RWAMarketplaceUpgradeable",
    },
    {
      name: "RWAStaking",
      proxyAddress: deployment.addresses.RWAStaking,
      implementationAddress: deployment.addresses.RWAStaking_Implementation,
      contractPath: "contracts/upgradeable/RWAStakingUpgradeable.sol:RWAStakingUpgradeable",
      contractName: "RWAStakingUpgradeable",
    },
    {
      name: "MembershipSystem",
      proxyAddress: deployment.addresses.MembershipSystem,
      implementationAddress: deployment.addresses.MembershipSystem_Implementation,
      contractPath: "contracts/upgradeable/MembershipSystemUpgradeable.sol:MembershipSystemUpgradeable",
      contractName: "MembershipSystemUpgradeable",
    },
  ];
  
  // Process each proxy contract
  for (const contract of proxyContracts) {
    console.log("\n" + "=".repeat(70));
    console.log(`🔍 Processing ${contract.name}`);
    console.log("=".repeat(70));
    
    // Get admin address from proxy
    const adminAddress = await getAdminAddress(contract.proxyAddress);
    if (!adminAddress) {
      console.log(`⚠️  Could not determine admin address, using ProxyAdmin from deployment`);
      const adminAddr = deployment.addresses.ProxyAdmin;
      if (!adminAddr) {
        console.log(`❌ No admin address found, skipping ${contract.name}`);
        continue;
      }
    }
    
    const finalAdminAddress = adminAddress || deployment.addresses.ProxyAdmin;
    
    // Verify implementation first
    const implResult = await verifyImplementation(
      contract.implementationAddress,
      contract.contractPath,
      contract.name
    );
    
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait between verifications
    
    // Get initialization data
    const initData = await getInitData(contract.contractName, contract.implementationAddress, contract.proxyAddress);
    
    // Verify proxy
    const proxyResult = await verifyProxy(
      contract.proxyAddress,
      contract.implementationAddress,
      finalAdminAddress!,
      initData,
      contract.name
    );
    
    results.push({
      contractName: contract.name,
      proxyAddress: contract.proxyAddress,
      implementationAddress: contract.implementationAddress,
      adminAddress: finalAdminAddress!,
      proxyVerified: proxyResult.success,
      implementationVerified: implResult.success,
      error: proxyResult.error || implResult.error,
      etherscanUrl: `https://sepolia.etherscan.io/address/${contract.proxyAddress}`,
    });
    
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait between contracts
  }
  
  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📋 VERIFICATION SUMMARY");
  console.log("=".repeat(70));
  
  const proxyVerified = results.filter((r) => r.proxyVerified).length;
  const implVerified = results.filter((r) => r.implementationVerified).length;
  const totalProxies = results.length;
  
  console.log(`\n✅ Proxy Contracts Verified: ${proxyVerified}/${totalProxies}`);
  console.log(`✅ Implementation Contracts Verified: ${implVerified}/${totalProxies}\n`);
  
  for (const result of results) {
    const proxyStatus = result.proxyVerified ? "✅" : "❌";
    const implStatus = result.implementationVerified ? "✅" : "❌";
    
    console.log(`${proxyStatus} ${result.contractName} Proxy`);
    console.log(`   Proxy: ${result.proxyAddress}`);
    console.log(`   ${implStatus} Implementation: ${result.implementationAddress}`);
    console.log(`   Admin: ${result.adminAddress}`);
    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    }
    console.log(`   Etherscan: ${result.etherscanUrl}\n`);
  }
  
  // Save results
  const resultsFile = path.join(__dirname, "../deployments/proxy-verification-results.json");
  fs.writeFileSync(
    resultsFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        network: deployment.network,
        results: results,
      },
      null,
      2
    )
  );
  console.log(`💾 Results saved to: ${resultsFile}`);
  
  if (proxyVerified < totalProxies || implVerified < totalProxies) {
    console.log("\n⚠️  Some contracts failed verification. Check errors above.");
    console.log("   Note: OpenZeppelin proxy contracts are often pre-verified on Etherscan.");
    console.log("   If proxy verification fails, check Etherscan directly - it may already be verified.");
  } else {
    console.log("\n🎉 All contracts verified successfully!");
  }
}

main().catch((error) => {
  console.error("❌ Verification script failed:", error);
  process.exit(1);
});

