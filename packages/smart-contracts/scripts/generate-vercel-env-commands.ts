/**
 * Generate Vercel Environment Variable Commands
 * 
 * Reads deployed-addresses-proxy.json and generates Vercel CLI commands
 * to update all NEXT_PUBLIC_* environment variables.
 * 
 * Usage: bun hardhat run scripts/generate-vercel-env-commands.ts
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
 * Map contract names to NEXT_PUBLIC environment variable names
 */
const ENV_VAR_MAPPING: { [key: string]: string } = {
  ProxyAdmin: "NEXT_PUBLIC_PROXY_ADMIN_ADDRESS",
  RWAAssetRegistry: "NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS",
  RWATokenFactory: "NEXT_PUBLIC_RWA_TOKEN_FACTORY_ADDRESS",
  RWATokenFactory404: "NEXT_PUBLIC_RWA_TOKEN_FACTORY_404_ADDRESS",
  RWAMarketplace: "NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS",
  RWAStaking: "NEXT_PUBLIC_RWA_STAKING_ADDRESS",
  RWARewardDistributor: "NEXT_PUBLIC_RWA_REWARD_DISTRIBUTOR_ADDRESS",
  RWARevenue: "NEXT_PUBLIC_RWA_REVENUE_ADDRESS",
  MembershipSystem: "NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS",
  RWAAssetRegistry_Implementation: "NEXT_PUBLIC_RWA_ASSET_REGISTRY_IMPL_ADDRESS",
  RWATokenFactory_Implementation: "NEXT_PUBLIC_RWA_TOKEN_FACTORY_IMPL_ADDRESS",
  RWAMarketplace_Implementation: "NEXT_PUBLIC_RWA_MARKETPLACE_IMPL_ADDRESS",
  RWAStaking_Implementation: "NEXT_PUBLIC_RWA_STAKING_IMPL_ADDRESS",
  MembershipSystem_Implementation: "NEXT_PUBLIC_MEMBERSHIP_SYSTEM_IMPL_ADDRESS",
};

/**
 * Generate Vercel CLI commands
 */
function generateVercelCommands(addresses: DeploymentAddresses): string {
  const commands: string[] = [];
  const network = addresses.network || "sepolia";
  const environment = network === "sepolia" ? "preview" : "production";

  commands.push("# Vercel Environment Variable Commands");
  commands.push(`# Generated for ${network} network`);
  commands.push(`# Environment: ${environment}`);
  commands.push("#");
  commands.push("# Usage:");
  commands.push("# 1. Copy the commands below");
  commands.push("# 2. Run them in your terminal");
  commands.push("# 3. Or use: vercel env pull to sync locally");
  commands.push("");
  commands.push("# Core Contracts");
  commands.push("");

  // Generate commands for each address
  Object.entries(addresses.addresses).forEach(([contractName, address]) => {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return;
    }

    const envVarName = ENV_VAR_MAPPING[contractName] || `NEXT_PUBLIC_${contractName.toUpperCase()}`;

    // Vercel CLI command format: vercel env add VARIABLE_NAME environment
    commands.push(`vercel env add ${envVarName} ${environment}`);
    commands.push(`echo "${envVarName}=${address}" | vercel env add ${envVarName} ${environment}`);
  });

  commands.push("");
  commands.push("# Network Configuration");
  commands.push(`vercel env add NEXT_PUBLIC_CHAIN_ID ${environment}`);
  commands.push(`echo "NEXT_PUBLIC_CHAIN_ID=11155111" | vercel env add NEXT_PUBLIC_CHAIN_ID ${environment}`);
  commands.push("");
  commands.push(`vercel env add NEXT_PUBLIC_NETWORK_NAME ${environment}`);
  commands.push(`echo "NEXT_PUBLIC_NETWORK_NAME=${network}" | vercel env add NEXT_PUBLIC_NETWORK_NAME ${environment}`);
  commands.push("");
  commands.push(`vercel env add NEXT_PUBLIC_EXPLORER_URL ${environment}`);
  commands.push(`echo "NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io" | vercel env add NEXT_PUBLIC_EXPLORER_URL ${environment}`);
  commands.push("");
  commands.push("# Marketplace Configuration");
  commands.push(`vercel env add NEXT_PUBLIC_MARKETPLACE_FEE_BPS ${environment}`);
  commands.push(`echo "NEXT_PUBLIC_MARKETPLACE_FEE_BPS=250" | vercel env add NEXT_PUBLIC_MARKETPLACE_FEE_BPS ${environment}`);

  return commands.join("\n");
}

/**
 * Generate .env.local format for easy copy-paste
 */
function generateEnvLocalFormat(addresses: DeploymentAddresses): string {
  const lines: string[] = [];
  const network = addresses.network || "sepolia";

  lines.push(`# RWA Marketplace Contract Addresses - ${network}`);
  lines.push(`# Generated from deployed-addresses-proxy.json`);
  lines.push(`# Date: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("# Network Configuration");
  lines.push("NEXT_PUBLIC_CHAIN_ID=11155111");
  lines.push(`NEXT_PUBLIC_NETWORK_NAME=${network}`);
  lines.push("NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io");
  lines.push("");
  lines.push("# Marketplace Configuration");
  lines.push("NEXT_PUBLIC_MARKETPLACE_FEE_BPS=250");
  lines.push("");
  lines.push("# Contract Addresses");

  Object.entries(addresses.addresses).forEach(([contractName, address]) => {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return;
    }

    const envVarName = ENV_VAR_MAPPING[contractName] || `NEXT_PUBLIC_${contractName.toUpperCase()}`;
    lines.push(`${envVarName}=${address}`);
  });

  return lines.join("\n");
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERCEL ENVIRONMENT VARIABLE COMMAND GENERATOR        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Load addresses
  const addresses = loadDeploymentAddresses();
  console.log(`📋 Loaded addresses from deployed-addresses-proxy.json`);
  console.log(`📡 Network: ${addresses.network}\n`);

  // Generate commands
  const vercelCommands = generateVercelCommands(addresses);
  const envLocalFormat = generateEnvLocalFormat(addresses);

  // Save to files
  const vercelCommandsFile = path.join(__dirname, "../vercel-env-commands.sh");
  const envLocalFile = path.join(__dirname, "../vercel-env.local");

  fs.writeFileSync(vercelCommandsFile, vercelCommands);
  fs.writeFileSync(envLocalFile, envLocalFormat);

  console.log("=".repeat(70));
  console.log("📝 GENERATED FILES");
  console.log("=".repeat(70));
  console.log(`\n✅ Vercel CLI commands: ${vercelCommandsFile}`);
  console.log(`✅ .env.local format: ${envLocalFile}\n`);

  // Display commands
  console.log("=".repeat(70));
  console.log("📋 VERCEL CLI COMMANDS");
  console.log("=".repeat(70));
  console.log("\n" + vercelCommands);

  console.log("\n" + "=".repeat(70));
  console.log("💡 USAGE INSTRUCTIONS");
  console.log("=".repeat(70));
  console.log("\nOption 1: Use Vercel CLI (Interactive)");
  console.log("  1. Run: vercel env add VARIABLE_NAME production");
  console.log("  2. Paste the value when prompted");
  console.log("  3. Repeat for each variable\n");

  console.log("Option 2: Use Vercel CLI (Non-interactive)");
  console.log("  1. Run: echo 'VALUE' | vercel env add VARIABLE_NAME production");
  console.log("  2. See generated commands above\n");

  console.log("Option 3: Use Vercel Dashboard");
  console.log("  1. Go to your Vercel project settings");
  console.log("  2. Navigate to Environment Variables");
  console.log("  3. Add variables from vercel-env.local file\n");

  console.log("Option 4: Use vercel env pull");
  console.log("  1. Set variables in Vercel dashboard");
  console.log("  2. Run: vercel env pull .env.local");
  console.log("  3. This syncs Vercel variables to local .env.local\n");

  console.log("=".repeat(70));
  console.log("🚀 After updating variables, redeploy:");
  console.log("   vercel --prod");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

