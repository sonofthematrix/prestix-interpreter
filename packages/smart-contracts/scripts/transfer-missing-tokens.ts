#!/usr/bin/env tsx

import { ethers } from 'hardhat';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: npx hardhat run scripts/transfer-missing-tokens.ts --network sepolia -- <tokenAddress> <recipientAddress> <tokenAmount>');
    console.log('');
    console.log('Example:');
    console.log('  npx hardhat run scripts/transfer-missing-tokens.ts --network sepolia -- \\');
    console.log('    0x883bed27a00f4513ac52606f3fc7aeb398aa717d \\');
    console.log('    0xFe3DafA1c35b0562A910359f67d71eCB21328205 \\');
    console.log('    5');
    console.log('');
    console.log('This will transfer 5 ASSET1 tokens to the user.');
    process.exit(1);
  }
  
  const [tokenAddress, recipientAddress, tokenAmountStr] = args;
  const tokenAmount = parseInt(tokenAmountStr, 10);
  
  if (isNaN(tokenAmount) || tokenAmount <= 0) {
    console.log('❌ Invalid token amount');
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Using admin wallet: ${deployer.address}\n`);
  
  // Get token contract
  const token = await ethers.getContractAt('IERC20', tokenAddress, deployer);
  
  try {
    // Get token info
    const [symbol, name, decimals] = await Promise.all([
      token.symbol(),
      token.name(),
      token.decimals(),
    ]);
    
    console.log('📋 Token Details:');
    console.log(`  Name: ${name}`);
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Decimals: ${decimals}`);
    console.log(`  Contract: ${tokenAddress}`);
    console.log('');
    
    // Check admin balance
    const adminBalance = await token.balanceOf(deployer.address);
    const adminBalanceFormatted = ethers.formatUnits(adminBalance, decimals);
    
    console.log('📊 Admin Balance:');
    console.log(`  Balance: ${adminBalanceFormatted} ${symbol}`);
    console.log(`  Raw: ${adminBalance.toString()} wei`);
    console.log('');
    
    // Calculate transfer amount in wei
    const transferAmountWei = ethers.parseUnits(tokenAmountStr, decimals);
    
    if (adminBalance < transferAmountWei) {
      console.log(`❌ Insufficient balance!`);
      console.log(`   Required: ${tokenAmount} ${symbol}`);
      console.log(`   Available: ${adminBalanceFormatted} ${symbol}`);
      process.exit(1);
    }
    
    console.log('💸 Transfer Details:');
    console.log(`  From: ${deployer.address}`);
    console.log(`  To: ${recipientAddress}`);
    console.log(`  Amount: ${tokenAmount} ${symbol}`);
    console.log(`  Wei: ${transferAmountWei.toString()}`);
    console.log('');
    
    console.log('⏳ Sending transfer transaction...');
    
    // Transfer tokens
    const tx = await token.transfer(recipientAddress, transferAmountWei);
    console.log(`  📤 Transaction submitted: ${tx.hash}`);
    
    console.log('  ⏳ Waiting for confirmation...');
    await tx.wait();
    
    console.log(`  ✅ Transfer confirmed!`);
    console.log('');
    
    // Verify recipient balance
    const recipientBalance = await token.balanceOf(recipientAddress);
    const recipientBalanceFormatted = ethers.formatUnits(recipientBalance, decimals);
    
    console.log('✅ Recipient New Balance:');
    console.log(`  Balance: ${recipientBalanceFormatted} ${symbol}`);
    console.log('');
    
    console.log('🔗 View on Etherscan:');
    console.log(`  https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log('');
    
    console.log('📋 Next Steps:');
    console.log('  1. Verify the transfer on Etherscan');
    console.log('  2. Update database token holder records:');
    console.log(`     bun run tsx scripts/sync-token-holder.ts ${recipientAddress} ${tokenAddress}`);
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
