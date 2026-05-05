#!/usr/bin/env tsx

import 'dotenv/config';
import path from 'path';
import { createHash } from 'crypto';
import RWAAssetRegistryUpgradeableABI from '../artifacts/contracts/core/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json';

async function main() {
  console.log('📊 Updating database with deployed registry contract...\n');

  // Registry contract details from deployment (UPDATED: January 16, 2026)
  const contractAddress = '0x4f641965145c93c81614e47dce16224d5eb2fcf9'; // NEW REGISTRY FROM ETHERSCAN
  const implementationAddress = '0x0cFDc1d5B5BAF41d07D207ACAD28dDC4D7092F96'; // From Etherscan
  const proxyAdminAddress = '0x4560287F546e819703CD96dF1c233bfcE7F43f91'; // Assuming same
  const networkId = 11155111; // Sepolia
  const deployerAddress = '0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047';
  const deploymentBlock = 0; // Will be set when running

  // Import database modules using relative paths
  // Note: These imports work because tsx resolves TypeScript files
  let createClient: any;
  let getSystemUser: any;
  
  try {
    // Use dynamic import with file:// protocol for absolute paths
    const rootPath = path.resolve(__dirname, '../../..');
    const dbPath = path.join(rootPath, 'src/lib/db.ts');
    const systemUserPath = path.join(rootPath, 'src/lib/utils/system-user.ts');
    
    // Import using file:// URL (works with tsx)
    const dbModule = await import(`file://${dbPath}`);
    createClient = dbModule.createClient;
    
    try {
      const systemUserModule = await import(`file://${systemUserPath}`);
      getSystemUser = systemUserModule.getSystemUser;
    } catch (error) {
      console.warn('⚠️  Could not load system-user module, using fallback');
      getSystemUser = async () => ({
        id: 'system',
        role: 'ADMIN' as const,
        email: 'system@TKNZN.pro',
        name: 'System Admin',
      });
    }
  } catch (error: any) {
    console.error('❌ Could not load database modules:', error.message);
    console.error('   Make sure DATABASE_URL is set and database is accessible');
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }

  if (!createClient || !getSystemUser) {
    console.error('❌ Database client or system user not available');
    process.exit(1);
  }

  try {
    // Get system user and create database client
    const systemUser = await getSystemUser();
    const db = createClient(systemUser);

    // Calculate ABI hash
    const abiString = JSON.stringify(RWAAssetRegistryUpgradeableABI.abi);
    const abiHash = createHash('sha256').update(abiString).digest('hex');

    // Convert networkId to string (schema expects string)
    const chainIdString = String(networkId);
    const contractAddressLower = contractAddress.toLowerCase();
    
    // Find or create BlockchainNetwork
    let blockchainNetwork = await db.blockchainNetwork.findFirst({
      where: {
        chainId: networkId,
      } as any,
    });
    
    if (!blockchainNetwork) {
      blockchainNetwork = await db.blockchainNetwork.create({
        data: {
          id: chainIdString,
          chainId: networkId,
          name: 'sepolia',
          displayName: 'Ethereum Sepolia Testnet',
          isTestnet: true,
          primaryRpcUrl: process.env.SEPOLIA_RPC_URL || '',
          explorerUrl: 'https://sepolia.etherscan.io',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        } as any,
      });
    }
    
    const networkIdString = String(blockchainNetwork.id);
    
    // Check for existing contract
    const existing = await db.deployedContract.findFirst({
      where: {
        contractAddress: contractAddressLower,
        networkId: networkIdString,
      } as any,
    });
    
    const contractDataToSave = {
      contractAddress: contractAddressLower,
      contractType: 'REGISTRY',
      contractName: 'RWAAssetRegistryUpgradeable',
      networkId: networkIdString,
      deployedBy: deployerAddress,
      deploymentTx: '',
      deploymentBlock: BigInt(deploymentBlock),
      deployedAt: new Date(),
      isUpgradeable: true,
      proxyType: 'transparent',
      implementationAddress: implementationAddress.toLowerCase(),
      proxyAdminAddress: proxyAdminAddress.toLowerCase(),
      version: '1.0.0',
      isActive: true,
      abiHash,
    };
    
    if (existing) {
      // Update existing contract
      await db.deployedContract.update({
        where: { id: existing.id },
        data: contractDataToSave,
      } as any);
      console.log('✅ Updated existing registry contract in database');
    } else {
      // Check for existing contract by type (unique constraint)
      const existingByType = await db.deployedContract.findFirst({
        where: {
          networkId: networkIdString,
          contractType: 'REGISTRY',
        } as any,
      });
      
      if (existingByType) {
        // Update existing contract to new address
        await db.deployedContract.update({
          where: { id: existingByType.id },
          data: contractDataToSave,
        } as any);
        console.log('✅ Updated existing REGISTRY contract to new address');
      } else {
        // Create new contract
        await db.deployedContract.create({
          data: contractDataToSave,
        } as any);
        console.log('✅ Created new registry contract in database');
      }
    }

    // Create or update ABI record
    await db.contractABI.upsert({
      where: { contractAddress: contractAddressLower } as any,
      create: {
        contractAddress: contractAddressLower,
        networkId: blockchainNetwork.id,
        abi: RWAAssetRegistryUpgradeableABI.abi,
        parsedFunctions: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'function'),
        parsedEvents: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'event'),
        parsedErrors: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'error'),
        contractName: 'RWAAssetRegistryUpgradeable',
        totalFunctions: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'function').length,
        totalEvents: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'event').length,
        hasPayable: RWAAssetRegistryUpgradeableABI.abi.some((item: any) => item.type === 'function' && item.payable),
        hasView: RWAAssetRegistryUpgradeableABI.abi.some((item: any) => item.type === 'function' && item.stateMutability === 'view'),
        hasPure: RWAAssetRegistryUpgradeableABI.abi.some((item: any) => item.type === 'function' && item.stateMutability === 'pure'),
        isVerified: true,
        verificationSource: 'factory',
      },
      update: {
        abi: RWAAssetRegistryUpgradeableABI.abi,
        parsedFunctions: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'function'),
        parsedEvents: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'event'),
        parsedErrors: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'error'),
        contractName: 'RWAAssetRegistryUpgradeable',
        totalFunctions: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'function').length,
        totalEvents: RWAAssetRegistryUpgradeableABI.abi.filter((item: any) => item.type === 'event').length,
        hasPayable: RWAAssetRegistryUpgradeableABI.abi.some((item: any) => item.type === 'function' && item.payable),
        hasView: RWAAssetRegistryUpgradeableABI.abi.some((item: any) => item.type === 'function' && item.stateMutability === 'view'),
        hasPure: RWAAssetRegistryUpgradeableABI.abi.some((item: any) => item.type === 'function' && item.stateMutability === 'pure'),
        isVerified: true,
        verificationSource: 'factory',
      },
    } as any);

    console.log('✅ Registry contract registered in database');
    console.log(`📋 Contract Address: ${contractAddress}`);
    console.log(`📋 Implementation: ${implementationAddress}`);
    console.log(`📋 Proxy Admin: ${proxyAdminAddress}`);
    console.log(`📋 Network: Sepolia (${networkId})`);
    console.log(`📋 Type: REGISTRY`);
    console.log(`📋 Upgradeable: Yes (Transparent Proxy)`);

  } catch (error: any) {
    console.error('❌ Failed to register registry contract:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n🎉 Database update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });