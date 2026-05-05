import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

/**
 * Health Check Script
 * 
 * Verifies deployed contracts are functioning correctly
 * 
 * Usage: bun run hardhat run scripts/health-check.ts --network sepolia
 */

interface HealthCheckResult {
  contract: string;
  address: string;
  checks: {
    deployed: boolean;
    paused: boolean;
    rolesConfigured: boolean;
    details: any;
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   DEPLOYMENT HEALTH CHECK                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  
  // Load deployment file
  const deploymentFile = path.join(__dirname, `../deployments/${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  console.log(`📋 Checking deployment: ${deployment.timestamp}`);
  console.log(`   Network: ${networkName}\n`);
  
  const results: HealthCheckResult[] = [];
  
  // Check RWAAssetRegistry
  console.log('🔍 Checking RWAAssetRegistry...');
  const registryAddress = deployment.contracts.RWAAssetRegistry.address;
  const registry = await ethers.getContractAt('RWAAssetRegistry', registryAddress);
  
  const registryPaused = await registry.paused();
  const marketplaceRole = await registry.MARKETPLACE_ROLE();
  const hasMarketplaceRole = await registry.hasRole(
    marketplaceRole,
    deployment.contracts.RWAMarketplace.address
  );
  const nextAssetId = await registry.getNextAssetId();
  
  results.push({
    contract: 'RWAAssetRegistry',
    address: registryAddress,
    checks: {
      deployed: true,
      paused: registryPaused,
      rolesConfigured: hasMarketplaceRole,
      details: {
        nextAssetId: nextAssetId.toString(),
      },
    },
    status: registryPaused ? 'degraded' : hasMarketplaceRole ? 'healthy' : 'degraded',
  });
  
  console.log(`   ✅ Deployed: ${registryAddress}`);
  console.log(`   ${registryPaused ? '⚠️' : '✅'} Paused: ${registryPaused}`);
  console.log(`   ${hasMarketplaceRole ? '✅' : '❌'} Marketplace Role: ${hasMarketplaceRole}`);
  console.log(`   📊 Next Asset ID: ${nextAssetId.toString()}`);
  
  // Check RWATokenFactory
  console.log('\n🔍 Checking RWATokenFactory...');
  const factoryAddress = deployment.contracts.RWATokenFactory.address;
  const factory = await ethers.getContractAt('RWATokenFactory', factoryAddress);
  
  const factoryPaused = await factory.paused();
  const tokenCreatorRole = await factory.TOKEN_CREATOR_ROLE();
  const hasCreatorRole = await factory.hasRole(
    tokenCreatorRole,
    deployment.contracts.RWAMarketplace.address
  );
  const allTokens = await factory.getAllTokens();
  const totalTokens = allTokens.length;
  
  results.push({
    contract: 'RWATokenFactory',
    address: factoryAddress,
    checks: {
      deployed: true,
      paused: factoryPaused,
      rolesConfigured: hasCreatorRole,
      details: {
        totalTokens: totalTokens.toString(),
      },
    },
    status: factoryPaused ? 'degraded' : hasCreatorRole ? 'healthy' : 'degraded',
  });
  
  console.log(`   ✅ Deployed: ${factoryAddress}`);
  console.log(`   ${factoryPaused ? '⚠️' : '✅'} Paused: ${factoryPaused}`);
  console.log(`   ${hasCreatorRole ? '✅' : '❌'} Token Creator Role: ${hasCreatorRole}`);
  console.log(`   📊 Total Tokens: ${totalTokens.toString()}`);
  
  // Check RWAMarketplace
  console.log('\n🔍 Checking RWAMarketplace...');
  const marketplaceAddress = deployment.contracts.RWAMarketplace.address;
  const marketplace = await ethers.getContractAt('RWAMarketplace', marketplaceAddress);
  
  const marketplacePaused = await marketplace.paused();
  const marketplaceRegistry = await marketplace.assetRegistry();
  const marketplaceFactory = await marketplace.tokenFactory();
  const marketplaceFee = await marketplace.getMarketplaceFee();
  const feeRecipient = await marketplace.getFeeRecipient();
  
  const configCorrect =
    marketplaceRegistry.toLowerCase() === registryAddress.toLowerCase() &&
    marketplaceFactory.toLowerCase() === factoryAddress.toLowerCase();
  
  results.push({
    contract: 'RWAMarketplace',
    address: marketplaceAddress,
    checks: {
      deployed: true,
      paused: marketplacePaused,
      rolesConfigured: configCorrect,
      details: {
        registry: marketplaceRegistry,
        factory: marketplaceFactory,
        feeBps: marketplaceFee.toString(),
        feeRecipient: feeRecipient,
      },
    },
    status: marketplacePaused ? 'degraded' : configCorrect ? 'healthy' : 'unhealthy',
  });
  
  console.log(`   ✅ Deployed: ${marketplaceAddress}`);
  console.log(`   ${marketplacePaused ? '⚠️' : '✅'} Paused: ${marketplacePaused}`);
  console.log(`   ${configCorrect ? '✅' : '❌'} Configuration: ${configCorrect ? 'Correct' : 'Incorrect'}`);
  console.log(`   📊 Marketplace Fee: ${marketplaceFee.toString()} bps`);
  console.log(`   💰 Fee Recipient: ${feeRecipient}`);
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Health Check Summary');
  console.log('='.repeat(70));
  
  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const degradedCount = results.filter(r => r.status === 'degraded').length;
  const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
  
  console.log(`\n✅ Healthy: ${healthyCount}`);
  console.log(`⚠️  Degraded: ${degradedCount}`);
  console.log(`❌ Unhealthy: ${unhealthyCount}`);
  
  results.forEach(result => {
    const icon = result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌';
    console.log(`\n${icon} ${result.contract}: ${result.status}`);
  });
  
  if (unhealthyCount > 0) {
    console.log('\n❌ Some contracts are unhealthy. Please review configuration.');
    process.exit(1);
  } else if (degradedCount > 0) {
    console.log('\n⚠️  Some contracts are paused or have configuration issues.');
  } else {
    console.log('\n✅ All contracts are healthy and ready for use!');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Health check failed:', error);
    process.exit(1);
  });

