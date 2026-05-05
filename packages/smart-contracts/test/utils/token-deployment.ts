/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BytesLike } from "ethers";

/**
 * Standardized TokenizinToken Deployment Utility
 * 
 * Handles both fresh deployments and reused contracts from Hardhat network state persistence.
 * Ensures deployer always has admin role and sufficient tokens for testing.
 */

export interface TokenDeploymentResult {
  token: any;
  isNew: boolean;
}

// Track if we've reset the network to prevent multiple resets
let networkResetAttempted = false;

/**
 * Deploy or reuse TokenizinToken with proper initialization handling
 * 
 * @param deployer - The signer that will receive admin role and initial tokens
 * @param options - Deployment options
 * @returns Token contract instance and whether it's a new deployment
 */
export async function deployTokenizinToken(
  deployer: SignerWithAddress,
  options?: {
    forceFresh?: boolean;
    minBalance?: bigint;
  }
): Promise<TokenDeploymentResult> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:28',message:'deployTigerPalaceToken entry',data:{deployer:deployer.address,forceFresh:options?.forceFresh,minBalance:options?.minBalance?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:39',message:'About to get contract factory',data:{contractName:'TokenizinToken'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const TokenizinToken = await ethers.getContractFactory("TokenizinToken");

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:43',message:'Contract factory obtained',data:{factoryExists:!!TokenizinToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Use deployment counter to get unique addresses when contracts are already initialized
  // This prevents getting the same deterministic address that's already initialized
  let token: any;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:48',message:'Starting deployment attempt',data:{attempt:attempts+1,maxAttempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Deploy contract - Hardhat will use deterministic address based on deployer nonce
      token = await TokenizinToken.deploy(); // Empty constructor

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:53',message:'Contract deployed, waiting for deployment',data:{attempt:attempts+1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      await token.waitForDeployment();
      const tokenAddress = await token.getAddress();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:59',message:'Deployment completed',data:{attempt:attempts+1,tokenAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Check if contract has code before trying to initialize
      const codeBeforeInit = await ethers.provider.getCode(tokenAddress);
      const deployerNonce = await ethers.provider.getTransactionCount(deployer.address);
      const hasCode = codeBeforeInit !== '0x' && codeBeforeInit.length > 2;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:70',message:'Before initialize attempt',data:{tokenAddress,deployerNonce,codeLength:codeBeforeInit.length,hasCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // If contract has code, check if it's already initialized before trying to initialize
      if (hasCode) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:78',message:'Checking if contract is initialized',data:{tokenAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion

          // Try to check if contract is initialized by reading a storage slot
          // Initializable contracts store initialization state in storage slot 0
          // If we can call DEFAULT_ADMIN_ROLE without error, contract is initialized
          const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
          const hasAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:87',message:'Contract initialization check result',data:{hasAdmin,deployer:deployer.address},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:68',message:'Contract has code - checking initialization state',data:{tokenAddress,hasAdmin,isInitialized:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
          // #endregion
          
          if (hasAdmin) {
            // Contract is initialized and we have admin - use it
            console.log(`✅ Using existing TokenizinToken at ${tokenAddress} (deployer has admin role)`);
            const balance = await token.balanceOf(deployer.address);
            const minBalance = options?.minBalance || ethers.parseEther("10000000");
            
            if (balance < minBalance) {
              const needed = minBalance - balance;
              await token.mint(deployer.address, needed);
              console.log(`✅ Minted ${ethers.formatEther(needed)} tokens to deployer`);
            }
            
            return { token, isNew: false };
          } else {
            // Contract is initialized but we don't have admin - skip this address
            console.warn(`⚠️ Contract at ${tokenAddress} initialized but deployer lacks admin. Skipping...`);
            attempts++;
            
            // Send a dummy transaction to increment nonce and get different address
            if (attempts < maxAttempts) {
              await deployer.sendTransaction({ to: deployer.address, value: 0 });
              continue; // Try again with next nonce
            }
            continue; // Exit loop if max attempts reached
          }
        } catch (checkError: any) {
          // If we can't check initialization state, try to initialize anyway
          // This handles edge cases where contract exists but isn't fully initialized
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:95',message:'Could not check initialization state, trying initialize',data:{tokenAddress,error:checkError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
          // #endregion
        }
      }
      
      // Try to initialize - if it succeeds, we're done
      try {
        await token.initialize(deployer.address);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:48',message:'Initialize succeeded',data:{tokenAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log("✅ TokenizinToken initialized successfully");
        return { token, isNew: true };
      } catch (initError: any) {
        // If already initialized, check if we can use it
        if (initError.message?.includes("already initialized")) {
          const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
          const hasAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:58',message:'Contract already initialized - checking admin',data:{tokenAddress,hasAdmin},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          
          if (hasAdmin) {
            // We can use this contract - it was initialized by us
            console.log(`✅ Using existing TokenizinToken at ${tokenAddress} (deployer has admin role)`);
            const balance = await token.balanceOf(deployer.address);
            const minBalance = options?.minBalance || ethers.parseEther("10000000");
            
            if (balance < minBalance) {
              const needed = minBalance - balance;
              await token.mint(deployer.address, needed);
              console.log(`✅ Minted ${ethers.formatEther(needed)} tokens to deployer`);
            }
            
            return { token, isNew: false };
          }
          
          // Contract initialized but we don't have admin - try next nonce
          console.warn(`⚠️ Contract at ${tokenAddress} initialized but deployer lacks admin. Trying next address...`);
          attempts++;
          
          // Send a dummy transaction to increment nonce and get different address
          if (attempts < maxAttempts) {
            await deployer.sendTransaction({ to: deployer.address, value: 0 });
            continue; // Try again with next nonce
          }
        } else {
          // Different error - rethrow
          throw initError;
        }
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:82',message:'Deployment error',data:{errorMessage:error.message,attempt:attempts+1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }
  
  // If we exhausted all attempts, try resetting network once and retry
  if (!networkResetAttempted && !options?.forceFresh) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:113',message:'Exhausted attempts - resetting network',data:{attempts:maxAttempts,deployerNonce:'checking'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    // Check deployer nonce before reset
    const nonceBeforeReset = await ethers.provider.getTransactionCount(deployer.address);
    
    console.warn(`⚠️ Exhausted ${maxAttempts} deployment attempts. Resetting network state...`);
    networkResetAttempted = true;

    // Only reset network state - no need to clean/compile since contract code hasn't changed
    await ethers.provider.send("hardhat_reset", []);
    
    // Check deployer nonce after reset
    const nonceAfterReset = await ethers.provider.getTransactionCount(deployer.address);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:120',message:'After hardhat_reset',data:{nonceBeforeReset,nonceAfterReset},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    console.log(`✅ Hardhat network reset - nonce: ${nonceAfterReset}`);
    
    // After reset, Hardhat's cache still has contracts at low addresses
    // Skip past cached addresses by incrementing nonce aggressively
    // We need to skip significantly more addresses (200+) to avoid all cached contracts
    const skipCount = 200; // Skip past first 200 addresses to avoid cached contracts
    console.log(`⚠️ Skipping past first ${skipCount} addresses to avoid Hardhat cache...`);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:195',message:'Skipping cached addresses after reset',data:{skipCount,nonceBeforeSkip:nonceAfterReset},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    // Send dummy transactions to increment nonce past cached addresses
    // Hardhat processes transactions synchronously, so we don't need to wait
    // This avoids gas reporter issues with self-transfer transactions
    for (let i = 0; i < skipCount; i++) {
      await deployer.sendTransaction({ to: deployer.address, value: 0 });
      // Don't call wait() - gas reporter has issues with self-transfer transactions
      // Hardhat processes transactions synchronously, so nonce increments immediately
    }
    
    const nonceAfterSkip = await ethers.provider.getTransactionCount(deployer.address);
    console.log(`✅ Skipped to nonce ${nonceAfterSkip} (past cached addresses)`);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'token-deployment.ts:205',message:'After skipping cached addresses',data:{nonceAfterSkip,expectedNonce:nonceAfterReset + skipCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    // Reset the flag so we can try again after reset
    networkResetAttempted = false;
    
    // Reset attempts and try again
    return deployTokenizinToken(deployer, { ...options, forceFresh: true });
  }
  
  // If we already reset or forceFresh is set, throw error
  throw new Error(
    `Cannot deploy TokenizinToken: Exhausted ${maxAttempts} deployment attempts. ` +
    `All addresses are already initialized by different deployers. ` +
    `Solution: Restart Hardhat node or manually reset the network state.`
  );
}

/**
 * Ensure deployer has sufficient tokens, minting if necessary
 * 
 * @param token - TokenizinToken contract instance
 * @param deployer - The signer to check/fund
 * @param minBalance - Minimum balance required (default: 10M tokens)
 */
export async function ensureDeployerBalance(
  token: any,
  deployer: SignerWithAddress,
  minBalance: bigint = ethers.parseEther("10000000")
): Promise<void> {
  const balance = await token.balanceOf(deployer.address);
  
  if (balance < minBalance) {
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const hasAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    
    if (!hasAdmin) {
      // Check if contract has any tokens at all
      const totalSupply = await token.totalSupply();
      if (totalSupply === 0n) {
        throw new Error("Deployer lacks admin role and cannot mint tokens. Contract has no tokens.");
      }
      // Contract has tokens but deployer doesn't have admin role
      // This can happen if contract was initialized by different deployer
      // Check if deployer has any balance at all
      if (balance === 0n) {
        throw new Error(`Deployer lacks admin role and has no tokens. Contract has ${ethers.formatEther(totalSupply)} total supply.`);
      }
      // Deployer has some balance but not enough - warn and continue
      console.warn(`⚠️ Deployer lacks admin role but has ${ethers.formatEther(balance)} tokens (need ${ethers.formatEther(minBalance)}). Continuing with available balance.`);
      return; // Don't throw, just return with available balance
    }
    
    const needed = minBalance - balance;
    console.log(`⚠️ Deployer balance insufficient. Minting ${ethers.formatEther(needed)} tokens...`);
    await token.mint(deployer.address, needed);
    console.log(`✅ Minted ${ethers.formatEther(needed)} tokens to deployer`);
  }
}

/**
 * Deploy TokenizinToken as upgradeable contract with UUPS proxy (production pattern)
 * 
 * This function matches the production deployment pattern used in scripts/deploy-tpt-token.ts
 * 
 * @param admin - The address that will receive admin role and initial tokens
 * @param options - Deployment options
 * @returns Token contract instance (proxy), proxy address, and implementation address
 */
export async function deployTokenizinTokenUpgradeable(
  admin: SignerWithAddress,
  options?: {
    minBalance?: bigint;
  }
): Promise<{
  token: any;
  proxyAddress: string;
  implementationAddress: string;
}> {
  console.log("📦 Deploying TokenizinToken as upgradeable contract (UUPS proxy)...");
  
  // Get ContractFactory
  const TokenizinToken = await ethers.getContractFactory("TokenizinToken");
  
  // Deploy proxy using OpenZeppelin Upgrades plugin (matching production)
  const tptToken = await upgrades.deployProxy(
    TokenizinToken,
    [admin.address], // initializer arguments
    {
      initializer: "initialize",
      kind: "uups", // Use UUPS proxy pattern
    }
  );
  
  await tptToken.waitForDeployment();
  
  const proxyAddress = await tptToken.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  
  console.log(`✅ TokenizinToken upgradeable deployed:`);
  console.log(`   Proxy: ${proxyAddress}`);
  console.log(`   Implementation: ${implementationAddress}`);
  
  // Ensure admin has sufficient balance if specified
  if (options?.minBalance) {
    await ensureDeployerBalance(tptToken, admin, options.minBalance);
  }
  
  return {
    token: tptToken,
    proxyAddress,
    implementationAddress,
  };
}

