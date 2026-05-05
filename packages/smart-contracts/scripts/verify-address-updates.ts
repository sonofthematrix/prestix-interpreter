/**
 * Verify Address Updates Script
 * 
 * Searches the codebase for old contract addresses and verifies they've been updated.
 * Compares addresses in deployed-addresses-proxy.json with addresses found in code files.
 * 
 * Usage: bun hardhat run scripts/verify-address-updates.ts
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

interface AddressMapping {
  [key: string]: string;
}

interface VerificationResult {
  file: string;
  oldAddresses: string[];
  newAddresses: string[];
  status: "updated" | "needs_update" | "not_found";
}

/**
 * Load current deployment addresses
 */
function loadDeploymentAddresses(): AddressMapping {
  const addressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
  if (!fs.existsSync(addressesFile)) {
    throw new Error("deployed-addresses-proxy.json not found. Run deployment first.");
  }

  const data = JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
  return data.addresses || {};
}

/**
 * Known old addresses to check for (from previous deployments)
 */
const OLD_ADDRESSES = [
  "0x1345f35238117b075056EeeF8fBe5e6504c632EB", // Old ProxyAdmin
  "0xf499a41F3dAeC24dae0a4E40dC965dB89E28fb28", // Old RWAAssetRegistry
  "0x743b2C7A1F2e325A9785252d21F99097B76A5E61", // Old RWATokenFactory
  "0x7a6f7dE826064903f2e419833b9633560217FEe2", // Old RWATokenFactory404
  "0xB9bcC66DcE89F6c4bfb03ed8a9E6EF7d447F2061", // Old RWAMarketplace
  "0x0368F457abB189fa08f88B02CAD429a243f15dCe", // Old RWAStaking
  "0xda46ff9382dFFb49261774c8C3B0c6Ac5fB7D694", // Old RWARewardDistributor
  "0x9DD2B48cA9D7147C30830D3629fDA8C1976F74Db", // Old RWARevenue
  "0xcb1017dd96C3F2C8FC74C0a558adA1FCD906A6d0", // Old MembershipSystem
  "0x1C2B5e0181667B68aBB9a5DA9D6C74e07986b42F", // Old RWAAssetRegistry_Implementation
  "0x6f5b2ceE7b2ed493a00Fd259b5CE070d1B4Ade39", // Old RWATokenFactory_Implementation
  "0x770AbBC3636433994439221028E087c44c0Bad8D", // Old RWAMarketplace_Implementation
  "0x288C50AD4De731579B155Ac47e072798E9Dd0Dd0", // Old RWAStaking_Implementation
  "0xa9F75C649CEab9Ec70514EC4De1d9361eD43d3a7", // Old MembershipSystem_Implementation
];

/**
 * Search for addresses in a file
 */
function findAddressesInFile(filePath: string, addresses: string[]): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const found: string[] = [];

  addresses.forEach((addr) => {
    // Case-insensitive search
    const regex = new RegExp(addr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(content)) {
      found.push(addr);
    }
  });

  return found;
}

/**
 * Check if file contains new addresses
 */
function findNewAddressesInFile(filePath: string, newAddresses: AddressMapping): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const found: string[] = [];

  Object.values(newAddresses).forEach((addr) => {
    if (addr && addr !== "0x0000000000000000000000000000000000000000") {
      const regex = new RegExp(addr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      if (regex.test(content)) {
        found.push(addr);
      }
    }
  });

  return found;
}

/**
 * Main verification function
 */
async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ADDRESS UPDATE VERIFICATION                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Load current addresses
  const currentAddresses = loadDeploymentAddresses();
  console.log(`📋 Loaded ${Object.keys(currentAddresses).length} addresses from deployed-addresses-proxy.json\n`);

  // Files to check
  const filePatterns = [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.json",
    "**/*.md",
    "**/.env*",
  ];

  // Exclude patterns
  const excludePatterns = [
    "node_modules/**",
    "artifacts/**",
    "cache/**",
    "typechain-types/**",
    ".git/**",
    "**/*.spec.ts", // Skip test files for now
  ];

  console.log("🔍 Searching for old addresses in codebase...\n");

  const results: VerificationResult[] = [];
  let totalOldAddressesFound = 0;
  let totalFilesChecked = 0;

  // Search in frontend-integration directory first (most important)
  const frontendIntegrationPath = path.join(__dirname, "../frontend-integration");
  if (fs.existsSync(frontendIntegrationPath)) {
    const frontendFiles = await glob("**/*.{ts,tsx,js,jsx}", {
      cwd: frontendIntegrationPath,
      absolute: true,
    });

    for (const file of frontendFiles) {
      totalFilesChecked++;
      const oldAddrs = findAddressesInFile(file, OLD_ADDRESSES);
      const newAddrs = findNewAddressesInFile(file, currentAddresses);

      if (oldAddrs.length > 0 || newAddrs.length > 0) {
        results.push({
          file: path.relative(process.cwd(), file),
          oldAddresses: oldAddrs,
          newAddresses: newAddrs,
          status: oldAddrs.length > 0 ? "needs_update" : "updated",
        });
        totalOldAddressesFound += oldAddrs.length;
      }
    }
  }

  // Search in scripts directory
  const scriptsPath = path.join(__dirname, ".");
  const scriptFiles = await glob("**/*.{ts,js}", {
    cwd: scriptsPath,
    absolute: true,
    ignore: ["**/node_modules/**"],
  });

  for (const file of scriptFiles) {
    totalFilesChecked++;
    const oldAddrs = findAddressesInFile(file, OLD_ADDRESSES);
    const newAddrs = findNewAddressesInFile(file, currentAddresses);

    if (oldAddrs.length > 0 || newAddrs.length > 0) {
      results.push({
        file: path.relative(process.cwd(), file),
        oldAddresses: oldAddrs,
        newAddresses: newAddrs,
        status: oldAddrs.length > 0 ? "needs_update" : "updated",
      });
      totalOldAddressesFound += oldAddrs.length;
    }
  }

  // Search in root directory for .env files
  const rootPath = path.join(__dirname, "..");
  const envFiles = await glob(".env*", {
    cwd: rootPath,
    absolute: true,
  });

  for (const file of envFiles) {
    totalFilesChecked++;
    const oldAddrs = findAddressesInFile(file, OLD_ADDRESSES);
    const newAddrs = findNewAddressesInFile(file, currentAddresses);

    if (oldAddrs.length > 0 || newAddrs.length > 0) {
      results.push({
        file: path.relative(process.cwd(), file),
        oldAddresses: oldAddrs,
        newAddresses: newAddrs,
        status: oldAddrs.length > 0 ? "needs_update" : "updated",
      });
      totalOldAddressesFound += oldAddrs.length;
    }
  }

  // Print results
  console.log("=".repeat(70));
  console.log("📊 VERIFICATION RESULTS");
  console.log("=".repeat(70));
  console.log(`\n📁 Files checked: ${totalFilesChecked}`);
  console.log(`🔍 Old addresses found: ${totalOldAddressesFound}`);

  if (results.length === 0) {
    console.log("\n✅ No old addresses found! All files appear to be updated.\n");
    return;
  }

  const needsUpdate = results.filter((r) => r.status === "needs_update");
  const updated = results.filter((r) => r.status === "updated");

  console.log(`\n⚠️  Files needing update: ${needsUpdate.length}`);
  console.log(`✅ Files already updated: ${updated.length}\n`);

  if (needsUpdate.length > 0) {
    console.log("=".repeat(70));
    console.log("⚠️  FILES NEEDING UPDATE");
    console.log("=".repeat(70));
    needsUpdate.forEach((result) => {
      console.log(`\n📄 ${result.file}`);
      console.log(`   Old addresses found: ${result.oldAddresses.length}`);
      result.oldAddresses.forEach((addr) => {
        console.log(`     - ${addr}`);
      });
      if (result.newAddresses.length > 0) {
        console.log(`   ✅ New addresses found: ${result.newAddresses.length}`);
      }
    });
  }

  if (updated.length > 0) {
    console.log("\n" + "=".repeat(70));
    console.log("✅ FILES ALREADY UPDATED");
    console.log("=".repeat(70));
    updated.forEach((result) => {
      console.log(`\n📄 ${result.file}`);
      console.log(`   ✅ Contains new addresses: ${result.newAddresses.length}`);
    });
  }

  // Check frontend-integration/rwa-contracts.ts specifically
  const frontendContractsFile = path.join(
    __dirname,
    "../frontend-integration/rwa-contracts.ts"
  );
  if (fs.existsSync(frontendContractsFile)) {
    console.log("\n" + "=".repeat(70));
    console.log("🔍 FRONTEND INTEGRATION FILE CHECK");
    console.log("=".repeat(70));
    const content = fs.readFileSync(frontendContractsFile, "utf-8");

    // Check if it contains current addresses
    const hasCurrentAddresses = Object.values(currentAddresses).some((addr) => {
      if (!addr || addr === "0x0000000000000000000000000000000000000000") return false;
      return content.includes(addr);
    });

    const hasOldAddresses = OLD_ADDRESSES.some((addr) => content.includes(addr));

    if (hasCurrentAddresses && !hasOldAddresses) {
      console.log("\n✅ frontend-integration/rwa-contracts.ts contains current addresses");
      console.log("✅ No old addresses found");
    } else if (hasOldAddresses) {
      console.log("\n⚠️  frontend-integration/rwa-contracts.ts contains old addresses");
      console.log("   Please run update-addresses-after-deployment.ts");
    } else {
      console.log("\n⚠️  frontend-integration/rwa-contracts.ts may not be updated");
      console.log("   Please verify manually");
    }
  }

  console.log("\n" + "=".repeat(70));
  if (needsUpdate.length === 0) {
    console.log("✅ VERIFICATION COMPLETE - All addresses updated!");
  } else {
    console.log("⚠️  VERIFICATION COMPLETE - Some files need updates");
    console.log("\n💡 Next step: Run update-addresses-after-deployment.ts");
  }
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

