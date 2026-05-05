#!/usr/bin/env bun

/**
 * Grant Roles Script
 * 
 * Grants required roles to admin wallet for monetary flow services
 * 
 * Required roles:
 * - MINTER_ROLE on TigerPalaceToken
 * - REVENUE_MANAGER_ROLE on RWARevenue
 * - DISTRIBUTOR_ROLE on RWARevenue
 * - REWARD_MANAGER_ROLE on RWARewardDistributor
 * - REVENUE_COLLECTOR_ROLE on RWARewardDistributor
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import path from 'path';

// Get __dirname using process.cwd() and script location
// This works in both CommonJS and ESM contexts
const __dirname = path.resolve(process.cwd(), 'smart-contracts/scripts');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`  ${message}`, 'blue');
}

// Contract ABIs (minimal for role management)
const ACCESS_CONTROL_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
];

const TPT_ABI = [
  ...ACCESS_CONTROL_ABI,
  'function MINTER_ROLE() view returns (bytes32)',
  'function BURNER_ROLE() view returns (bytes32)',
];

const RWA_REVENUE_ABI = [
  ...ACCESS_CONTROL_ABI,
  'function REVENUE_MANAGER_ROLE() view returns (bytes32)',
  'function DISTRIBUTOR_ROLE() view returns (bytes32)',
];

const RWA_REWARD_DISTRIBUTOR_ABI = [
  ...ACCESS_CONTROL_ABI,
  'function REWARD_MANAGER_ROLE() view returns (bytes32)',
  'function REVENUE_COLLECTOR_ROLE() view returns (bytes32)',
];

const RWA_STAKING_ABI = [
  ...ACCESS_CONTROL_ABI,
  'function POOL_MANAGER_ROLE() view returns (bytes32)',
  'function REWARD_MANAGER_ROLE() view returns (bytes32)',
];

interface RoleConfig {
  contractName: string;
  contractAddress: string;
  roleName: string;
  roleGetter: string;
  abi: string[];
}

async function grantRole(
  signer: ethers.Signer,
  contractAddress: string,
  roleName: string,
  roleGetter: string,
  abi: string[],
  targetAddress: string
): Promise<boolean> {
  try {
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    // Get role hash
    const roleHash = await contract[roleGetter]();
    
    // Check if role already granted
    const hasRole = await contract.hasRole(roleHash, targetAddress);
    if (hasRole) {
      logSuccess(`${roleName} already granted on ${contractAddress.slice(0, 10)}...`);
      return true;
    }

    // Grant role
    logInfo(`Granting ${roleName}...`);
    const tx = await contract.grantRole(roleHash, targetAddress);
    logInfo(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    logSuccess(`${roleName} granted successfully (block: ${receipt.blockNumber})`);
    
    return true;
  } catch (error: any) {
    logError(`Failed to grant ${roleName}: ${error.message}`);
    return false;
  }
}

async function main() {
  log(`${colors.bold}🔐 Granting Required Roles${colors.reset}\n`);

  // Get configuration from environment
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || adminPrivateKey;

  if (!rpcUrl) {
    logError('SEPOLIA_RPC_URL or NEXT_PUBLIC_SEPOLIA_RPC_URL not configured');
    process.exit(1);
  }

  if (!deployerPrivateKey) {
    logError('DEPLOYER_PRIVATE_KEY or ADMIN_PRIVATE_KEY not configured');
    logInfo('The deployer wallet must have DEFAULT_ADMIN_ROLE to grant roles');
    process.exit(1);
  }

  const adminAddress = process.env.ADMIN_ADDRESS;
  if (!adminAddress) {
    logError('ADMIN_ADDRESS not configured');
    logInfo('Set ADMIN_ADDRESS to the wallet address that needs roles');
    process.exit(1);
  }

  // Get contract addresses
  const tptAddress = process.env.TIGER_PALACE_TOKEN_CONTRACT_ADDRESS;
  const revenueAddress = process.env.RWA_REVENUE_CONTRACT_ADDRESS || '0x55b23576e535504F6db282159CD082bD97e16989';
  const distributorAddress = process.env.RWA_REWARD_DISTRIBUTOR_CONTRACT_ADDRESS || '0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB';
  const stakingAddress = process.env.RWA_STAKING_CONTRACT_ADDRESS || '0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc';

  log(`Admin Address: ${adminAddress}`);
  log(`RPC URL: ${rpcUrl.replace(/\/v3\/[^/]+/, '/v3/***')}\n`);

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(deployerPrivateKey, provider);

  log(`Deployer Address: ${deployer.address}\n`);

  // Check deployer balance
  const balance = await provider.getBalance(deployer.address);
  if (balance === 0n) {
    logError('Deployer wallet has no balance. Please fund it.');
    process.exit(1);
  }
  logInfo(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  // Roles to grant
  const roles: RoleConfig[] = [];

  if (tptAddress) {
    roles.push({
      contractName: 'TigerPalaceToken',
      contractAddress: tptAddress,
      roleName: 'MINTER_ROLE',
      roleGetter: 'MINTER_ROLE',
      abi: TPT_ABI,
    });
  }

  roles.push(
    {
      contractName: 'RWARevenue',
      contractAddress: revenueAddress,
      roleName: 'REVENUE_MANAGER_ROLE',
      roleGetter: 'REVENUE_MANAGER_ROLE',
      abi: RWA_REVENUE_ABI,
    },
    {
      contractName: 'RWARevenue',
      contractAddress: revenueAddress,
      roleName: 'DISTRIBUTOR_ROLE',
      roleGetter: 'DISTRIBUTOR_ROLE',
      abi: RWA_REVENUE_ABI,
    },
    {
      contractName: 'RWARewardDistributor',
      contractAddress: distributorAddress,
      roleName: 'REWARD_MANAGER_ROLE',
      roleGetter: 'REWARD_MANAGER_ROLE',
      abi: RWA_REWARD_DISTRIBUTOR_ABI,
    },
    {
      contractName: 'RWARewardDistributor',
      contractAddress: distributorAddress,
      roleName: 'REVENUE_COLLECTOR_ROLE',
      roleGetter: 'REVENUE_COLLECTOR_ROLE',
      abi: RWA_REWARD_DISTRIBUTOR_ABI,
    },
    {
      contractName: 'RWAStaking',
      contractAddress: stakingAddress,
      roleName: 'POOL_MANAGER_ROLE',
      roleGetter: 'POOL_MANAGER_ROLE',
      abi: RWA_STAKING_ABI,
    },
    {
      contractName: 'RWAStaking',
      contractAddress: stakingAddress,
      roleName: 'REWARD_MANAGER_ROLE',
      roleGetter: 'REWARD_MANAGER_ROLE',
      abi: RWA_STAKING_ABI,
    }
  );

  // Grant each role
  let successCount = 0;
  let failureCount = 0;

  for (const role of roles) {
    log(`\n${colors.bold}Processing ${role.contractName} - ${role.roleName}${colors.reset}`);
    log(`Contract: ${role.contractAddress}`);

    const success = await grantRole(
      deployer,
      role.contractAddress,
      role.roleName,
      role.roleGetter,
      role.abi,
      adminAddress
    );

    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  // Summary
  log(`\n${colors.bold}📊 Summary:${colors.reset}`);
  logSuccess(`Successfully granted: ${successCount} roles`);
  if (failureCount > 0) {
    logError(`Failed to grant: ${failureCount} roles`);
  }

  if (failureCount === 0) {
    logSuccess('\n🎉 All roles granted successfully!');
    log('\nAdmin wallet is now configured for monetary flow services.');
  } else {
    logWarning('\n⚠️  Some roles failed to grant. Please check errors above.');
    process.exit(1);
  }
}

main().catch((error) => {
  logError(`Script failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});