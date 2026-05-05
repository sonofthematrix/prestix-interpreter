/**
 * Update Frontend Integration Contracts File
 * 
 * Specifically updates frontend-integration/rwa-contracts.ts with new contract addresses
 * from deployed-addresses-proxy.json.
 * 
 * Usage: bun hardhat run scripts/update-frontend-contracts.ts
 */

import fs from "fs";
import path from "path";

interface DeploymentAddresses {
  network: string;
  addresses: {
    [key: string]: string;
  };
}

/**
 * Load deployment addresses
 */
function loadDeploymentAddresses(): DeploymentAddresses {
  const addressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
  if (!fs.existsSync(addressesFile)) {
    throw new Error("deployed-addresses-proxy.json not found. Run deployment first.");
  }

  return JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
}

/**
 * Update frontend contracts file
 */
function updateFrontendContractsFile(addresses: DeploymentAddresses): void {
  const frontendFile = path.join(__dirname, "../frontend-integration/rwa-contracts.ts");

  if (!fs.existsSync(frontendFile)) {
    throw new Error(`Frontend contracts file not found: ${frontendFile}`);
  }

  let content = fs.readFileSync(frontendFile, "utf-8");

  // Map contract names to the format used in the frontend file
  const contractMappings: { [key: string]: string } = {
    ProxyAdmin: "ProxyAdmin",
    RWAAssetRegistry: "RWAAssetRegistry",
    RWATokenFactory: "RWATokenFactory",
    RWATokenFactory404: "RWATokenFactory404",
    RWAMarketplace: "RWAMarketplace",
    RWAStaking: "RWAStaking",
    RWARewardDistributor: "RWARewardDistributor",
    RWARevenue: "RWARevenue",
    MembershipSystem: "MembershipSystem",
    RWAAssetRegistry_Implementation: "RWAAssetRegistry_Implementation",
    RWATokenFactory_Implementation: "RWATokenFactory_Implementation",
    RWAMarketplace_Implementation: "RWAMarketplace_Implementation",
    RWAStaking_Implementation: "RWAStaking_Implementation",
    MembershipSystem_Implementation: "MembershipSystem_Implementation",
  };

  let updated = false;

  // Update addresses in the sepolia section
  Object.entries(contractMappings).forEach(([deploymentKey, frontendKey]) => {
    const address = addresses.addresses[deploymentKey];
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return;
    }

    // Pattern to match: frontendKey: '0x...' as Address,
    const pattern = new RegExp(
      `(${frontendKey}:\\s*')(0x[a-fA-F0-9]{40})('\\s*as\\s*Address)`,
      "g"
    );

    if (pattern.test(content)) {
      content = content.replace(pattern, `$1${address}$3`);
      updated = true;
      console.log(`✅ Updated ${frontendKey}: ${address}`);
    } else {
      // Try without 'as Address' suffix
      const pattern2 = new RegExp(`(${frontendKey}:\\s*')(0x[a-fA-F0-9]{40})(')`, "g");
      if (pattern2.test(content)) {
        content = content.replace(pattern2, `$1${address}$3`);
        updated = true;
        console.log(`✅ Updated ${frontendKey}: ${address}`);
      }
    }
  });

  // Update the generated timestamp
  const timestampPattern = /Generated:\s*\d{4}-\d{2}-\d{2}T[\d:Z.]+/;
  const newTimestamp = `Generated: ${new Date().toISOString()}`;
  if (timestampPattern.test(content)) {
    content = content.replace(timestampPattern, newTimestamp);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(frontendFile, content);
    console.log(`\n✅ Updated ${frontendFile}`);
  } else {
    console.log(`\n⚠️  No updates needed in ${frontendFile}`);
  }
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   FRONTEND CONTRACTS FILE UPDATER                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Load addresses
    const addresses = loadDeploymentAddresses();
    console.log(`📋 Loaded addresses from deployed-addresses-proxy.json`);
    console.log(`📡 Network: ${addresses.network}\n`);

    // Update frontend file
    updateFrontendContractsFile(addresses);

    console.log("\n" + "=".repeat(70));
    console.log("✅ UPDATE COMPLETE");
    console.log("=".repeat(70));
    console.log("\n📝 Next steps:");
    console.log("   1. Review frontend-integration/rwa-contracts.ts");
    console.log("   2. Commit changes to version control");
    console.log("   3. Update Vercel environment variables");
    console.log("   4. Redeploy frontend\n");
  } catch (error: any) {
    console.error("\n❌ Update failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

