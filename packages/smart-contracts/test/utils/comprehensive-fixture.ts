/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseEther, ZeroAddress, MaxUint256 } from "ethers";
import { deployTokenizinTokenUpgradeable } from "./token-deployment";
import { deployUpgradeableEcosystem } from "./upgradeable-fixture";

/**
 * Comprehensive Test Fixture for All Contract Types
 *
 * Provides standardized deployment and setup for:
 * - Marketplace ecosystem (registry, factory, marketplace)
 * - Token ecosystem (ERC404 factories, token creation)
 * - Staking ecosystem (staking, revenue, rewards)
 * - Payment tokens (USDC, EURC, TPT)
 * - Test accounts with pre-funded balances
 * - Role configurations and permissions
 *
 * Usage:
 * ```typescript
 * import { deployComprehensiveTestFixture } from "../utils/comprehensive-fixture";
 *
 * describe("My Test Suite", () => {
 *   let fixture: ComprehensiveFixtureData;
 *
 *   beforeEach(async () => {
 *     fixture = await deployComprehensiveTestFixture();
 *   });
 *
 *   it("should work", async () => {
 *     // Use fixture.contracts.marketplace, fixture.accounts.buyer1, etc.
 *   });
 * });
 * ```
 */

export interface ComprehensiveFixtureData {
  // Contract ecosystems
  contracts: {
    // Marketplace ecosystem
    assetRegistry: any;
    tokenFactory: any;
    tokenFactory404: any;
    marketplace: any;

    // Staking ecosystem
    staking: any;
    revenue: any;
    rewardDistributor: any;

    // Token ecosystem
    tokenizinToken: any;
    usdcToken: any;
    eurcToken: any;

    // Test tokens and assets
    testTokens: { [key: string]: { token: any; address: string } };
  };

  // Test accounts
  accounts: {
    deployer: SignerWithAddress;
    assetOwner: SignerWithAddress;
    buyer1: SignerWithAddress;
    buyer2: SignerWithAddress;
    buyer3: SignerWithAddress;
    treasury: SignerWithAddress;
    feeRecipient: SignerWithAddress;
    staker: SignerWithAddress;
    liquidityProvider: SignerWithAddress;
  };

  // Test data
  data: {
    assetIds: bigint[];
    tokenAddresses: string[];
    initialBalances: {
      [key: string]: bigint; // Account address -> balance
    };
    marketplaceFee: bigint;
    tokenPrices: bigint[];
  };

  // Utilities
  utils: {
    mintTokens: (assetId: number, amount: bigint, recipient: string) => Promise<void>;
    purchaseTokens: (assetId: number, tokenAmount: bigint, buyer: SignerWithAddress, paymentToken?: string) => Promise<any>;
    createListing: (assetId: number, price: bigint) => Promise<void>;
    stakeTokens: (amount: bigint, staker: SignerWithAddress) => Promise<void>;
    fundAccount: (account: SignerWithAddress, amount: bigint, token?: string) => Promise<void>;
  };
}

/**
 * Deploy comprehensive test fixture with all contract ecosystems
 */
export async function deployComprehensiveTestFixture(
  options: {
    numAssets?: number;
    marketplaceFee?: number;
    initialTokenSupply?: bigint;
    fundAccounts?: boolean;
  } = {}
): Promise<ComprehensiveFixtureData> {
  const {
    numAssets = 2,
    marketplaceFee = 250, // 2.5%
    initialTokenSupply = parseEther("1000"), // 1000 tokens
    fundAccounts = true
  } = options;

  console.log("🔧 Deploying comprehensive test fixture...");

  // Get signers
  const [
    deployer,
    assetOwner,
    buyer1,
    buyer2,
    buyer3,
    treasury,
    feeRecipient,
    staker,
    liquidityProvider
  ] = await ethers.getSigners();

  console.log("👥 Signers initialized");

  // Deploy marketplace ecosystem
  console.log("🏛️  Deploying marketplace ecosystem...");
  const marketplaceEcosystem = await deployMarketplaceEcosystem(deployer, treasury);

  // Deploy staking ecosystem
  console.log("💰 Deploying staking ecosystem...");
  const stakingEcosystem = await deployStakingEcosystem(deployer, treasury);

  // Deploy payment tokens
  console.log("💳 Deploying payment tokens...");
  const paymentTokens = await deployPaymentTokens(deployer);

  // Create test assets and tokens
  console.log("🏭 Creating test assets and tokens...");
  const testAssets = await createTestAssets(
    marketplaceEcosystem,
    assetOwner,
    numAssets,
    initialTokenSupply
  );

  // Configure marketplace listings
  console.log("📋 Configuring marketplace listings...");
  await configureMarketplaceListings(
    marketplaceEcosystem,
    testAssets,
    marketplaceFee
  );

  // Fund test accounts
  if (fundAccounts) {
    console.log("💰 Funding test accounts...");
    await fundTestAccounts(
      paymentTokens,
      [buyer1, buyer2, buyer3, staker, liquidityProvider],
      deployer
    );
  }

  // Initialize staking system
  console.log("🎯 Initializing staking system...");
  await initializeStakingSystem(stakingEcosystem, deployer);

  // Create utility functions
  const utils = createTestUtils(
    marketplaceEcosystem,
    stakingEcosystem,
    paymentTokens,
    testAssets,
    deployer
  );

  // Collect all contract references
  const contracts = {
    // Marketplace ecosystem
    assetRegistry: marketplaceEcosystem.assetRegistry,
    tokenFactory: marketplaceEcosystem.tokenFactory,
    tokenFactory404: marketplaceEcosystem.tokenFactory404,
    marketplace: marketplaceEcosystem.marketplace,

    // Staking ecosystem
    staking: stakingEcosystem.staking,
    revenue: stakingEcosystem.revenue,
    rewardDistributor: stakingEcosystem.rewardDistributor,

    // Token ecosystem
    tokenizinToken: paymentTokens.tokenizinToken,
    usdcToken: paymentTokens.usdcToken,
    eurcToken: paymentTokens.eurcToken,

    // Test tokens
    testTokens: testAssets.tokens
  };

  // Collect test data
  const data = {
    assetIds: testAssets.assetIds,
    tokenAddresses: testAssets.tokenAddresses,
    initialBalances: await collectInitialBalances([
      buyer1, buyer2, buyer3, staker, liquidityProvider
    ], paymentTokens),
    marketplaceFee: BigInt(marketplaceFee),
    tokenPrices: testAssets.prices
  };

  const fixture: ComprehensiveFixtureData = {
    contracts,
    accounts: {
      deployer,
      assetOwner,
      buyer1,
      buyer2,
      buyer3,
      treasury,
      feeRecipient,
      staker,
      liquidityProvider
    },
    data,
    utils
  };

  console.log("✅ Comprehensive test fixture deployed successfully!");
  return fixture;
}

/**
 * Deploy marketplace ecosystem (registry, factories, marketplace)
 */
async function deployMarketplaceEcosystem(deployer: SignerWithAddress, treasury: SignerWithAddress) {
  // Deploy AssetRegistry
  const AssetRegistry = await ethers.getContractFactory("RWAAssetRegistry");
  const assetRegistry = await AssetRegistry.deploy();
  await assetRegistry.waitForDeployment();

  // Deploy TokenFactory (ERC20)
  const TokenFactory = await ethers.getContractFactory("RWATokenFactory");
  const tokenFactory = await TokenFactory.deploy();
  await tokenFactory.waitForDeployment();

  // Deploy TokenFactory404 (ERC404)
  const TokenFactory404 = await ethers.getContractFactory("RWATokenFactory404Fixed");
  const tokenFactory404 = await TokenFactory404.deploy();
  await tokenFactory404.waitForDeployment();

  // Deploy Marketplace
  const Marketplace = await ethers.getContractFactory("RWAMarketplace");
  const marketplace = await Marketplace.deploy(
    await assetRegistry.getAddress(),
    await tokenFactory.getAddress(),
    treasury.address, // fee recipient
    ZeroAddress, // paymentToken (ETH by default)
    await tokenFactory404.getAddress()
  );
  await marketplace.waitForDeployment();

  // Grant marketplace roles
  await assetRegistry.grantRole(await assetRegistry.MARKETPLACE_ROLE(), marketplace.target);
  await tokenFactory.grantRole(await tokenFactory.TOKEN_CREATOR_ROLE(), marketplace.target);
  await tokenFactory404.grantRole(await tokenFactory404.TOKEN_CREATOR_ROLE(), marketplace.target);

  return {
    assetRegistry,
    tokenFactory,
    tokenFactory404,
    marketplace
  };
}

/**
 * Deploy staking ecosystem
 */
async function deployStakingEcosystem(deployer: SignerWithAddress, treasury: SignerWithAddress) {
  // Deploy using upgradeable fixture for production-grade setup
  const fixture = await deployUpgradeableEcosystem([deployer, treasury]);

  return {
    staking: fixture.TigerStaking,
    revenue: fixture.rwaRevenue,
    rewardDistributor: fixture.rewardDistributor
  };
}

/**
 * Deploy payment tokens (USDC, EURC, TPT)
 */
async function deployPaymentTokens(deployer: SignerWithAddress) {
  // Deploy TokenizinToken (TPT)
  const tokenizinToken = await deployTokenizinTokenUpgradeable(deployer, {
    minBalance: parseEther("10000000") // 10M tokens minimum
  });

  // Deploy mock USDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdcToken = await MockUSDC.deploy(parseEther("1000000")); // 1M USDC
  await usdcToken.waitForDeployment();

  // Deploy mock EURC
  const MockEURC = await ethers.getContractFactory("MockEURC");
  const eurcToken = await MockEURC.deploy(parseEther("1000000")); // 1M EURC
  await eurcToken.waitForDeployment();

  return {
    tokenizinToken: tokenizinToken.token,
    usdcToken,
    eurcToken
  };
}

/**
 * Create test assets and deploy tokens
 */
async function createTestAssets(
  marketplaceEcosystem: any,
  assetOwner: SignerWithAddress,
  numAssets: number,
  initialSupply: bigint
) {
  const { assetRegistry, tokenFactory404, marketplace } = marketplaceEcosystem;

  const assetIds: bigint[] = [];
  const tokenAddresses: string[] = [];
  const prices: bigint[] = [];
  const tokens: { [key: string]: { token: any; address: string } } = {};

  for (let i = 1; i <= numAssets; i++) {
    const assetId = BigInt(i);
    const tokenPrice = parseEther((10 * i).toString()); // 10 ETH, 20 ETH, etc.
    const assetName = `Test Asset ${i}`;
    const assetSymbol = `ASSET${i}`;

    // Register asset
    await assetRegistry.registerAsset(
      assetId,
      initialSupply,
      assetName,
      assetSymbol,
      tokenPrice,
      assetOwner.address
    );

    // Deploy ERC404 token
    const tx = await tokenFactory404.connect(assetOwner).createToken404(
      assetId,
      assetName,
      assetSymbol,
      initialSupply,
      assetOwner.address,
      marketplace.target, // Marketplace receives tokens (custody pattern)
      `https://api.tigerpalace.pro/assets/${assetId}/metadata.json`
    );

    const receipt = await tx.wait();
    const tokenAddress = receipt.logs[0].args[0]; // TokenCreated event

    // Get token contract
    const token = await ethers.getContractAt("RWAToken404Fixed", tokenAddress);

    assetIds.push(assetId);
    tokenAddresses.push(tokenAddress);
    prices.push(tokenPrice);
    tokens[`asset${i}`] = { token, address: tokenAddress };
  }

  return {
    assetIds,
    tokenAddresses,
    prices,
    tokens
  };
}

/**
 * Configure marketplace listings
 */
async function configureMarketplaceListings(
  marketplaceEcosystem: any,
  testAssets: any,
  marketplaceFee: number
) {
  const { marketplace } = marketplaceEcosystem;

  for (let i = 0; i < testAssets.assetIds.length; i++) {
    const assetId = testAssets.assetIds[i];
    const price = testAssets.prices[i];

    // Create marketplace listing
    await marketplace.createListing(assetId, price);
  }

  // Set marketplace fee
  await marketplace.setMarketplaceFee(marketplaceFee);
}

/**
 * Fund test accounts with payment tokens
 */
async function fundTestAccounts(
  paymentTokens: any,
  accounts: SignerWithAddress[],
  deployer: SignerWithAddress
) {
  const { tokenizinToken, usdcToken, eurcToken } = paymentTokens;
  const fundAmount = parseEther("10000"); // 10k tokens each

  for (const account of accounts) {
    // Fund with ETH
    await deployer.sendTransaction({
      to: account.address,
      value: parseEther("100") // 100 ETH
    });

    // Fund with TPT
    await tokenizinToken.transfer(account.address, fundAmount);

    // Fund with USDC
    await usdcToken.transfer(account.address, fundAmount);

    // Fund with EURC
    await eurcToken.transfer(account.address, fundAmount);
  }
}

/**
 * Initialize staking system
 */
async function initializeStakingSystem(stakingEcosystem: any, deployer: SignerWithAddress) {
  const { staking, revenue, rewardDistributor } = stakingEcosystem;

  // Fund reward distributor
  const rewardAmount = parseEther("100000");
  await deployer.sendTransaction({
    to: rewardDistributor.target,
    value: rewardAmount
  });

  // Approve staking contract to spend reward tokens
  await rewardDistributor.approve(staking.target, MaxUint256);

  // Initialize staking pools if needed
  // (implementation depends on staking contract interface)
}

/**
 * Collect initial account balances
 */
async function collectInitialBalances(
  accounts: SignerWithAddress[],
  paymentTokens: any
): Promise<{ [key: string]: bigint }> {
  const balances: { [key: string]: bigint } = {};

  for (const account of accounts) {
    const address = account.address;

    // ETH balance
    const ethBalance = await ethers.provider.getBalance(address);
    balances[`${address}_ETH`] = ethBalance;

    // TPT balance
    const tptBalance = await paymentTokens.tokenizinToken.balanceOf(address);
    balances[`${address}_TPT`] = tptBalance;

    // USDC balance
    const usdcBalance = await paymentTokens.usdcToken.balanceOf(address);
    balances[`${address}_USDC`] = usdcBalance;

    // EURC balance
    const eurcBalance = await paymentTokens.eurcToken.balanceOf(address);
    balances[`${address}_EURC`] = eurcBalance;
  }

  return balances;
}

/**
 * Create test utility functions
 */
function createTestUtils(
  marketplaceEcosystem: any,
  stakingEcosystem: any,
  paymentTokens: any,
  testAssets: any,
  deployer: SignerWithAddress
) {
  return {
    /**
     * Mint additional tokens for an asset
     */
    mintTokens: async (assetId: number, amount: bigint, recipient: string) => {
      const { tokenFactory404 } = marketplaceEcosystem;
      await tokenFactory404.mintTokens(assetId, recipient, amount);
    },

    /**
     * Purchase tokens from marketplace
     */
    purchaseTokens: async (
      assetId: number,
      tokenAmount: bigint,
      buyer: SignerWithAddress,
      paymentToken?: string
    ) => {
      const { marketplace } = marketplaceEcosystem;

      if (!paymentToken || paymentToken === 'ETH') {
        // ETH purchase
        const listing = await marketplace.getActiveListing(assetId);
        const totalCost = (listing.pricePerToken * tokenAmount) +
                         ((listing.pricePerToken * tokenAmount * BigInt(250)) / BigInt(10000)); // 2.5% fee

        return await marketplace.connect(buyer).purchaseTokens(assetId, tokenAmount, {
          value: totalCost
        });
      } else {
        // Token purchase
        const tokenContract = paymentToken === 'USDC' ? paymentTokens.usdcToken :
                             paymentToken === 'EURC' ? paymentTokens.eurcToken :
                             paymentTokens.tokenizinToken;

        const listing = await marketplace.getActiveListing(assetId);
        const totalCost = (listing.pricePerToken * tokenAmount) +
                         ((listing.pricePerToken * tokenAmount * BigInt(250)) / BigInt(10000));

        // Approve marketplace to spend tokens
        await tokenContract.connect(buyer).approve(marketplace.target, totalCost);

        return await marketplace.connect(buyer).purchaseTokensWithERC20(
          assetId,
          tokenAmount,
          tokenContract.target
        );
      }
    },

    /**
     * Create marketplace listing
     */
    createListing: async (assetId: number, price: bigint) => {
      const { marketplace } = marketplaceEcosystem;
      await marketplace.createListing(assetId, price);
    },

    /**
     * Stake tokens
     */
    stakeTokens: async (amount: bigint, staker: SignerWithAddress) => {
      const { staking } = stakingEcosystem;
      // Implementation depends on staking contract interface
      // await staking.connect(staker).stake(amount);
    },

    /**
     * Fund account with tokens
     */
    fundAccount: async (account: SignerWithAddress, amount: bigint, token?: string) => {
      if (!token || token === 'ETH') {
        await deployer.sendTransaction({
          to: account.address,
          value: amount
        });
      } else {
        const tokenContract = token === 'USDC' ? paymentTokens.usdcToken :
                             token === 'EURC' ? paymentTokens.eurcToken :
                             paymentTokens.tokenizinToken;

        await tokenContract.transfer(account.address, amount);
      }
    }
  };
}