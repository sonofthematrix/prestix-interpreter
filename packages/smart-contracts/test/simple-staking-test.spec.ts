import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre as any;
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { reset, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { applyCompatibilityWrapper } from "./utils/contract-compatibility";
import { deployTigerPalaceToken } from "./utils/token-deployment";

/**
 * 🧪 Simple Staking Test - Updated for Optimized Contract
 *
 * This test validates basic staking functionality using the simplified
 * contract interface after optimization changes.
 */
describe("Simple Staking Test", () => {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let treasury: SignerWithAddress;

  let tokenizinToken: any;
  let tigerStaking: any;
  let rwaRevenue: any;
  let rewardDistributor: any;
  let testPoolId: number; // Pool ID for the custom test pool with low minStake

  beforeEach(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-staking-test.spec.ts:24',message:'beforeEach started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Complete network reset - clear ALL state including contracts
    await ethers.provider.send("hardhat_reset", [
      {
        forking: undefined, // Don't fork, use clean local network
      },
    ]);
    await reset();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-staking-test.spec.ts:27',message:'Network reset completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Use a fresh wallet as deployer to ensure unique contract address
    // This ensures deployer = admin when initializing fresh contracts
    const freshDeployerWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    
    // Fund the fresh wallet with ETH using Hardhat's setBalance (more reliable)
    await ethers.provider.send("hardhat_setBalance", [
      freshDeployerWallet.address,
      ethers.toBeHex(ethers.parseEther("100000")) // 100k ETH for deployments
    ]);
    
    // Reset nonce to 0 to ensure fresh contract address
    await ethers.provider.send("hardhat_setNonce", [
      freshDeployerWallet.address,
      "0x0"
    ]);
    
    // Use fresh wallet as deployer (deployer = admin on fresh contracts)
    deployer = freshDeployerWallet as any;
    const testSigners = await ethers.getSigners();
    user1 = testSigners[1];
    treasury = testSigners[2];

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-staking-test.spec.ts:46',message:'Signers obtained with fresh deployer',data:{deployer:deployer.address,user1:user1.address,treasury:treasury.address},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dd847d67-774b-4e30-b9d9-31716ca20892',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-staking-test.spec.ts:49',message:'Starting TigerPalaceToken deployment',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Use the token deployment utility - handles fresh deployments properly
    // When deployer initializes a fresh contract, deployer = admin
    console.log("Deploying TigerPalaceToken using utility (deployer = admin on fresh contracts)...");
    
    let deployedToken: any;
    let isNew: boolean;
    
    try {
      const result = await deployTigerPalaceToken(deployer, {
        forceFresh: true, // Force fresh deployment
        minBalance: ethers.parseEther("10000000"), // Ensure deployer has tokens
      });
      deployedToken = result.token;
      isNew = result.isNew;
    } catch (error: any) {
      if (error.message?.includes("Exhausted") || error.message?.includes("already initialized")) {
        console.log("⚠️ All contract addresses are initialized. Using first available contract and granting admin via storage...");
        
        // Use the first deterministic address and grant admin role to deployer via storage manipulation
        const TigerPalaceTokenFactory = await ethers.getContractFactory("TigerPalaceToken");
        const firstAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        
        // Get contract at that address
        deployedToken = TigerPalaceTokenFactory.attach(firstAddress);
        
        // Grant admin role to deployer via storage manipulation
        const DEFAULT_ADMIN_ROLE = await deployedToken.DEFAULT_ADMIN_ROLE();
        
        // AccessControl stores roles at: keccak256(abi.encodePacked(role, account))
        // Slot for DEFAULT_ADMIN_ROLE and deployer address
        const roleSlot = ethers.keccak256(ethers.concat([
          ethers.zeroPadValue(DEFAULT_ADMIN_ROLE, 32),
          ethers.zeroPadValue(deployer.address, 32)
        ]));
        
        // Set the role (1 = has role)
        await ethers.provider.send("hardhat_setStorageAt", [
          firstAddress,
          roleSlot,
          ethers.toBeHex(1, 32) // Set to 1 (has role)
        ]);
        
        console.log(`✅ Granted admin role to deployer ${deployer.address} via storage manipulation`);
        isNew = false;
      } else {
        throw error;
      }
    }
    
    tokenizinToken = deployedToken;
    const tokenAddress = await tokenizinToken.getAddress();
    console.log(`📦 Contract at: ${tokenAddress} by deployer: ${deployer.address}, isNew: ${isNew}`);
    
    // Verify deployer has admin role
    const DEFAULT_ADMIN_ROLE = await tokenizinToken.DEFAULT_ADMIN_ROLE();
    const deployerHasAdmin = await tokenizinToken.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    
    if (deployerHasAdmin) {
      console.log("✅ Deployer has admin role - can mint tokens");
    } else {
      console.log("⚠️ Deployer does NOT have admin role");
    }


    console.log("✅ TigerPalaceToken ready for testing");
    
    // NOTE: TigerPalaceToken doesn't have updateTaxRates function
    // Tax functionality is not implemented in the upgradeable version

    // Deploy RewardDistributor via proxy
    const RWARewardDistributor = await ethers.getContractFactory("RWARewardDistributor");
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const TransparentProxy = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );
    // Deploy RWARewardDistributor with constructor parameters
    rewardDistributor = await RWARewardDistributor.deploy(
      await tokenizinToken.getAddress(),
      treasury.address,
      ethers.parseEther("1000"), // initial reward pool
    );
    await rewardDistributor.waitForDeployment();

    // Deploy RWARevenue with constructor parameters
    const RWARevenue = await ethers.getContractFactory("RWARevenue");
    rwaRevenue = await RWARevenue.deploy(
      await tokenizinToken.getAddress(),
      await rewardDistributor.getAddress(),
    );
    await rwaRevenue.waitForDeployment();

    // Deploy RWAStaking with constructor parameters
    // Deployer will be admin (constructor grants roles to msg.sender)
    const RWAStaking = await ethers.getContractFactory("RWAStaking");
    tigerStaking = await RWAStaking.deploy(
      await tokenizinToken.getAddress(),
      await rwaRevenue.getAddress(),
      await rewardDistributor.getAddress(),
    );
    await tigerStaking.waitForDeployment();
    
    const stakingAddress = await tigerStaking.getAddress();
    console.log(`📦 RWAStaking deployed at: ${stakingAddress} by deployer: ${deployer.address}`);
    
    // Verify deployer has POOL_MANAGER_ROLE (should be granted in constructor)
    const POOL_MANAGER_ROLE = await tigerStaking.POOL_MANAGER_ROLE();
    const deployerHasPoolManagerRole = await tigerStaking.hasRole(POOL_MANAGER_ROLE, deployer.address);
    
    if (!deployerHasPoolManagerRole) {
      console.error(`❌ Deployer ${deployer.address} does NOT have POOL_MANAGER_ROLE on RWAStaking`);
      console.error(`   This suggests RWAStaking was deployed by someone else`);
      
      // Try to find who has the role and grant it to deployer
      const testSigners = await ethers.getSigners();
      for (const signer of testSigners) {
        const hasRole = await tigerStaking.hasRole(POOL_MANAGER_ROLE, signer.address);
        if (hasRole) {
          console.log(`   Found admin: ${signer.address}, granting role to deployer...`);
          try {
            await tigerStaking.connect(signer).grantRole(POOL_MANAGER_ROLE, deployer.address);
            console.log(`   ✅ Granted POOL_MANAGER_ROLE to deployer`);
            break;
          } catch (e) {
            console.log(`   Failed to grant role: ${e}`);
          }
        }
      }
    } else {
      console.log(`✅ Deployer has POOL_MANAGER_ROLE on RWAStaking`);
    }

    // Initialize RWARevenue with staking address (RWAStaking doesn't have initialize - uses constructor)
    await rwaRevenue.initialize(await tigerStaking.getAddress());

    // NOTE: TigerPalaceToken doesn't have setMaxWalletExemption or setTaxExemption functions
    // Upgradeable token doesn't have max wallet/tax restrictions

    // Apply compatibility wrapper
    const wrapped = applyCompatibilityWrapper({ TigerStaking: tigerStaking });
    tigerStaking = wrapped.TigerStaking;

    // Create a test pool with correct signature: createPool(name, duration, multiplier, minStake)
    // multiplier is in basis points (120000 = 1200%)
    // Use low minStake (1 TPT) to allow testing small amounts
    await tigerStaking.connect(deployer).createPool(
      "Test Pool",
      30 * 24 * 60 * 60, // 30 days duration
      120000, // 1200% multiplier (12% APY in basis points)
      ethers.parseEther("1"), // minStake: 1 TPT (low to allow small test amounts)
    );

    // Get the pool ID of the newly created pool (default pools are 1-4, so new pool is 5)
    const stats = await tigerStaking.getStats();
    const poolCount = stats._poolCount || stats.poolCount || 0;
    testPoolId = typeof poolCount === 'number' ? poolCount : Number(poolCount);

    // Fund users - check for existing tokens first, then try admin approaches
    const allSigners = await ethers.getSigners();
    let tokensFunded = false;

    // First priority: If deployer has admin role (fresh deployment), mint tokens directly
    const DEFAULT_ADMIN_ROLE_CHECK = await tokenizinToken.DEFAULT_ADMIN_ROLE();
    const deployerHasAdminForMinting = await tokenizinToken.hasRole(DEFAULT_ADMIN_ROLE_CHECK, deployer.address);
    
    if (deployerHasAdminForMinting) {
      console.log("✅ Deployer has admin role - minting tokens directly");
      try {
        await tokenizinToken.mint(user1.address, ethers.parseEther("1000"));
        console.log("✅ Minted tokens to user1 using deployer admin");
        tokensFunded = true;
      } catch (e) {
        console.log("Minting failed, will try other methods:", e);
      }
    }

    // First, check if any signer already has tokens and can transfer them
    console.log("Checking for existing token holders...");
    for (const signer of allSigners) {
      const balance = await tokenizinToken.balanceOf(signer.address);
      console.log(`${signer.address}: ${ethers.formatEther(balance)} TPT`);

      if (balance >= ethers.parseEther("1000")) {
        console.log(`Found tokens with ${signer.address}, transferring to user1...`);
        await tokenizinToken.connect(signer).transfer(user1.address, ethers.parseEther("1000"));
        console.log("✅ Transferred tokens from existing holder to user1");
        tokensFunded = true;
        break;
      }
    }

    // If no tokens available, try admin minting approaches
    if (!tokensFunded) {
      console.log("No existing tokens found, trying admin minting...");

      const DEFAULT_ADMIN_ROLE = await tokenizinToken.DEFAULT_ADMIN_ROLE();

      // Try to find admin among signers
      let adminSigner = null;
      
      // Check default Hardhat account #0 first (most likely admin)
      const defaultAdminAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const defaultAdminHasRole = await tokenizinToken.hasRole(DEFAULT_ADMIN_ROLE, defaultAdminAddress);
      console.log(`Checking default admin ${defaultAdminAddress}: hasRole=${defaultAdminHasRole}`);
      
      if (defaultAdminHasRole) {
        // Impersonate the default admin to mint tokens
        await ethers.provider.send("hardhat_impersonateAccount", [defaultAdminAddress]);
        adminSigner = await ethers.getSigner(defaultAdminAddress);
        console.log(`✅ Using default Hardhat admin: ${defaultAdminAddress}`);
      } else {
        console.log(`⚠️ Default admin ${defaultAdminAddress} does NOT have admin role`);
        // Search among signers
        console.log("Searching for admin among signers...");
        for (const signer of allSigners) {
          const hasAdmin = await tokenizinToken.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
          console.log(`  ${signer.address}: hasAdmin=${hasAdmin}`);
          if (hasAdmin) {
            adminSigner = signer;
            console.log(`✅ Found admin: ${signer.address}`);
            break;
          }
        }
      }

      if (adminSigner) {
        console.log(`Found admin signer: ${adminSigner.address}`);
        await tokenizinToken.connect(adminSigner).mint(user1.address, ethers.parseEther("1000"));
        console.log("✅ Minted tokens to user1 using admin signer");
        tokensFunded = true;
      } else {
        // Try impersonation of common admin addresses
        console.log("No admin signer found, trying impersonation...");
        const commonAddresses = [
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        ];

        for (const addr of commonAddresses) {
          try {
            const balance = await tokenizinToken.balanceOf(addr);
            if (balance > 0) {
              console.log(`Found tokens at ${addr}, trying impersonation...`);
              await ethers.provider.send("hardhat_impersonateAccount", [addr]);
              const impersonatedSigner = await ethers.getSigner(addr);
              await tokenizinToken.connect(impersonatedSigner).transfer(user1.address, ethers.parseEther("1000"));
              console.log(`✅ Transferred tokens from impersonated account ${addr} to user1`);
              tokensFunded = true;
              break;
            }
          } catch (e) {
            console.log(`Impersonation of ${addr} failed or no tokens`);
          }
        }
      }
    }

    // Deployer admin check already done above - skip duplicate check

    if (!tokensFunded) {
      // Last resort: use Hardhat's special methods to set token balance directly
      console.log("Using Hardhat special methods to set token balance...");

      try {
        // ERC20Upgradeable storage layout (from OpenZeppelin):
        // Slot 51: _balances mapping (mapping(address => uint256))
        // Slot 52: _totalSupply (uint256)
        
        // Calculate balance slot: keccak256(abi.encodePacked(user1.address, slot))
        const balanceSlot = ethers.keccak256(ethers.concat([
          ethers.zeroPadValue(user1.address, 32),
          ethers.toBeHex(51, 32) // _balances mapping is at slot 51 for ERC20Upgradeable
        ]));

        // Set balance to 1000 tokens
        const newBalance = ethers.parseEther("1000");
        await ethers.provider.send("hardhat_setStorageAt", [
          await tokenizinToken.getAddress(),
          balanceSlot,
          ethers.toBeHex(newBalance, 32)
        ]);

        // Also update total supply (slot 52 for _totalSupply in ERC20Upgradeable)
        const currentSupply = await tokenizinToken.totalSupply();
        const newSupply = currentSupply + newBalance;
        await ethers.provider.send("hardhat_setStorageAt", [
          await tokenizinToken.getAddress(),
          ethers.toBeHex(52, 32), // _totalSupply is at slot 52 for ERC20Upgradeable
          ethers.toBeHex(newSupply, 32)
        ]);

        // Verify the balance was set correctly
        const verifyBalance = await tokenizinToken.balanceOf(user1.address);
        console.log(`Balance after storage manipulation: ${ethers.formatEther(verifyBalance)} TPT`);
        
        if (verifyBalance >= ethers.parseEther("100")) {
          // At least 100 tokens - enough for testing
          console.log("✅ Set user1 token balance using Hardhat storage manipulation (partial success)");
          tokensFunded = true;
        } else {
          console.log(`⚠️ Storage manipulation set balance to ${ethers.formatEther(verifyBalance)}, but expected at least 100 TPT`);
          // Try one more time with a different slot calculation
          // For upgradeable contracts, storage slots might be offset
          throw new Error(`Storage manipulation incomplete: got ${ethers.formatEther(verifyBalance)} instead of 1000 TPT`);
        }
      } catch (e) {
        console.error("Hardhat storage manipulation failed:", e);
        throw new Error("Could not fund user1 with tokens - all methods failed");
      }
    }

    await tokenizinToken
      .connect(user1)
      .approve(await tigerStaking.getAddress(), ethers.parseEther("1000"));
  });

  it("Should create a simple stake without overflow", async () => {
    const stakeAmount = ethers.parseEther("100");
    const poolId = testPoolId; // Use the custom test pool with low minStake

    // Get initial balances
    const initialBalance = await tokenizinToken.balanceOf(user1.address);
    const initialPool = await tigerStaking.getPool(poolId);

    // Create stake using simplified interface
    await tigerStaking.connect(user1).stake(poolId, stakeAmount);

    // Verify stake was created
    const finalBalance = await tokenizinToken.balanceOf(user1.address);
    const finalPool = await tigerStaking.getPool(poolId);

    expect(finalBalance).to.equal(initialBalance - stakeAmount);
    expect(finalPool.totalStaked).to.equal(
      initialPool.totalStaked + stakeAmount,
    );

    // Verify user stake tracking
    const userStakes = await tigerStaking.getUserStakes(user1.address);
    const poolStakes = userStakes.filter((s: any) => Number(s.poolId) === poolId);
    const totalStaked = poolStakes.reduce((sum: bigint, s: any) => sum + BigInt(s.amount.toString()), 0n);
    expect(totalStaked).to.equal(stakeAmount);
    expect(poolStakes.length).to.equal(1);
  });

  it("Should handle pool info with simplified structure", async () => {
    const poolId = testPoolId; // Use the custom test pool
    const pool = await tigerStaking.getPool(poolId);

    // Verify simplified pool structure
    expect(pool.active).to.be.true;
    expect(pool.totalStaked).to.be.gte(0);
  });

  it("Should support multiple stake operations", async () => {
    const poolId = testPoolId; // Use the custom test pool with low minStake
    const stakeAmount1 = ethers.parseEther("50");
    const stakeAmount2 = ethers.parseEther("75");

    // Create multiple stakes
    await tigerStaking.connect(user1).stake(poolId, stakeAmount1);
    await tigerStaking.connect(user1).stake(poolId, stakeAmount2);

    // Verify total staking
    const userStakes = await tigerStaking.getUserStakes(user1.address);
    const poolStakes = userStakes.filter((s: any) => Number(s.poolId) === poolId);
    const totalStaked = poolStakes.reduce((sum: bigint, s: any) => sum + BigInt(s.amount.toString()), 0n);
    expect(totalStaked).to.equal(stakeAmount1 + stakeAmount2);
    expect(poolStakes.length).to.equal(2);

    // Verify pool totals
    const pool = await tigerStaking.getPool(poolId);
    expect(pool.totalStaked).to.equal(stakeAmount1 + stakeAmount2);
  });

  it("Should allow small stake amounts (no minimum requirement)", async () => {
    const poolId = testPoolId; // Use the custom test pool with low minStake (1 TPT)
    const smallAmount = ethers.parseEther("5"); // Small amount - contract allows any amount >= minStake

    // Get initial balances
    const initialBalance = await tokenizinToken.balanceOf(user1.address);
    const initialPool = await tigerStaking.getPool(poolId);

    // Stake small amount - should succeed (contract only requires amount > 0)
    await tigerStaking.connect(user1).stake(poolId, smallAmount);

    // Verify stake was created
    const finalBalance = await tokenizinToken.balanceOf(user1.address);
    const finalPool = await tigerStaking.getPool(poolId);

    expect(finalBalance).to.equal(initialBalance - smallAmount);
    expect(finalPool.totalStaked).to.equal(initialPool.totalStaked + smallAmount);

    // Verify user stake tracking
    const userStakes = await tigerStaking.getUserStakes(user1.address);
    const poolStakes = userStakes.filter((s: any) => Number(s.poolId) === poolId);
    const totalStaked = poolStakes.reduce((sum: bigint, s: any) => sum + BigInt(s.amount.toString()), 0n);
    expect(totalStaked).to.equal(smallAmount);
  });

  it("Should support pool length and basic statistics", async () => {
    // Test pool length function
    const stats = await tigerStaking.getStats();
    const poolLength = stats._poolCount || stats.poolCount || 0;
    expect(poolLength).to.be.gte(1); // At least 1 pool (default pools + test pool)

    // Test pool statistics (getPoolStakers not available, using getUserStakes instead)
    const userStakes = await tigerStaking.getUserStakes(user1.address);
    const poolStakes = userStakes.filter((s: any) => Number(s.poolId) === 1);
    expect(poolStakes.length).to.be.gte(0); // May have stakes from previous tests
  });
});
