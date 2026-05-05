import dotenv from 'dotenv';
import fs from 'fs';
import { ethers } from 'hardhat';
import path from 'path';

/**
 * Update Fee Recipient Script
 * 
 * Updates the fee recipient address for the RWAMarketplace contract
 * 
 * Usage: bun run hardhat run scripts/update-fee-recipient.ts --network sepolia
 */

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   UPDATE FEE RECIPIENT                                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Load environment variables
  const envLocalPath = path.join(__dirname, '../.env.local');
  const envPath = path.join(__dirname, '../.env');
  
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  
  // Load deployment info
  const deploymentFile = path.join(__dirname, '../deployments/sepolia.json');
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  const marketplaceAddress = deployment.contracts.RWAMarketplace.address;
  
  // New fee recipient address
  const newFeeRecipient = process.env.NEW_FEE_RECIPIENT || '0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047';
  
  console.log(`📋 Configuration:`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  console.log(`   New Fee Recipient: ${newFeeRecipient}\n`);
  
  // Connect to contract
  const marketplace = await ethers.getContractAt('RWAMarketplace', marketplaceAddress);
  
  // Check current fee recipient
  const currentFeeRecipient = await marketplace.getFeeRecipient();
  console.log(`📊 Current Fee Recipient: ${currentFeeRecipient}`);
  
  if (currentFeeRecipient.toLowerCase() === newFeeRecipient.toLowerCase()) {
    console.log('✅ Fee recipient is already set to the target address');
    return;
  }
  
  // Check if deployer has admin role
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer: ${deployer.address}`);
  
  const DEFAULT_ADMIN_ROLE = await marketplace.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  if (!hasAdminRole) {
    throw new Error(`Deployer ${deployer.address} does not have DEFAULT_ADMIN_ROLE`);
  }
  
  console.log(`✅ Deployer has admin role\n`);
  
  // Update fee recipient
  console.log(`🔄 Updating fee recipient...`);
  const tx = await marketplace.setFeeRecipient(newFeeRecipient);
  console.log(`   Transaction: ${tx.hash}`);
  
  console.log(`⏳ Waiting for confirmation...`);
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
  
  // Verify the change
  const updatedFeeRecipient = await marketplace.getFeeRecipient();
  console.log(`\n📊 Updated Fee Recipient: ${updatedFeeRecipient}`);
  
  if (updatedFeeRecipient.toLowerCase() === newFeeRecipient.toLowerCase()) {
    console.log('✅ Fee recipient updated successfully!');
    
    // Update deployment file
    deployment.feeRecipient = newFeeRecipient;
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log(`\n💾 Updated deployment file: ${deploymentFile}`);
    
    console.log(`\n🔗 Explorer Links:`);
    console.log(`   Transaction: https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log(`   Marketplace: https://sepolia.etherscan.io/address/${marketplaceAddress}`);
  } else {
    throw new Error('Fee recipient update failed - addresses do not match');
  }
  
  console.log('\n' + '='.repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

