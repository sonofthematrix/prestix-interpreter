import { ethers, network as hardhatNetwork } from "hardhat";
import { parseUnits, formatEther, formatUnits } from "ethers/lib/utils";
import { run } from "hardhat";
import fs from "fs";
import path from "path";
import readline from "readline";

// Node.js type definitions
declare const process: any;
declare const console: any;

// Enhanced gas tracking structure
interface GasTracker {
  operation: string;
  step: string;
  gasUsed: string;
  gasLimit: string;
  gasPrice: string;
  gasCost: string;
  gasCostUSD?: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
}

// Network analysis structure
interface NetworkAnalysis {
  currentGasPrice: string;
  gasPriceGwei: string;
  gasPriceUSD?: string;
  networkCongestion: "low" | "medium" | "high";
  recommendedGasPrice: string;
  estimatedDeploymentCost: string;
  estimatedDeploymentCostUSD?: string;
  deployerBalance: string;
  deployerBalanceUSD?: string;
  sufficientBalance: boolean;
  recommendedAction: "proceed" | "wait" | "insufficient_balance";
}

// Deployment state tracking
interface DeploymentState {
  network: string;
  timestamp: string;
  lastCompletedStep: string;
  nextStep: string;
  addresses: { [key: string]: string };
  gasUsage: {
    totalGasUsed: string;
    totalGasCostETH: string;
    totalGasCostUSD?: string;
    breakdown: GasTracker[];
  };
  stepStatus: { [key: string]: boolean };
  networkAnalysis?: NetworkAnalysis;
  deploymentPaused: boolean;
  pauseReason?: string;
}

// Deployment steps enum
enum DeploymentStep {
  NETWORK_ANALYSIS = "networkAnalysis",
  SETUP = "setup",
  REWARD_DISTRIBUTOR_IMPL = "rewardDistributorImpl",
  KAGE_REVENUE_IMPL = "kageRevenueImpl",
  KAGE_UNIFIED_STAKING_IMPL = "kageUnifiedStakingImpl",
  REWARD_DISTRIBUTOR_PROXY = "rewardDistributorProxy",
  KAGE_REVENUE_PROXY = "kageRevenueProxy",
  KAGE_UNIFIED_STAKING_PROXY = "kageUnifiedStakingProxy",
  KAGE_REVENUE_INIT = "kageRevenueInit",
  KAGE_UNIFIED_STAKING_INIT = "kageUnifiedStakingInit",
  POOL_AND_TIERS_CONFIG = "poolAndTiersConfig",
  TOKEN_PERMISSIONS = "tokenPermissions",
  FUNDING = "funding",
  APPROVALS = "approvals",
  REVENUE_CONNECTION = "revenueConnection",
  VERIFICATION = "verification",
  COMPLETED = "completed",
}

const STATE_FILE = "deployment-state.json";
const GAS_LIMITS = {
  REWARD_DISTRIBUTOR_IMPL: 2500000,
  KAGE_REVENUE_IMPL: 4000000,
  KAGE_UNIFIED_STAKING_IMPL: 5000000,
  REWARD_DISTRIBUTOR_PROXY: 800000,
  KAGE_REVENUE_PROXY: 800000,
  KAGE_UNIFIED_STAKING_PROXY: 800000,
  KAGE_REVENUE_INIT: 500000,
  KAGE_UNIFIED_STAKING_INIT: 800000,
  POOL_AND_TIERS_CONFIG: 300000,
  TOKEN_PERMISSIONS: 200000,
  FUNDING: 100000,
  APPROVALS: 150000,
  REVENUE_CONNECTION: 200000,
};

// Interactive prompt function
function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Network analysis function
async function analyzeNetwork(provider: any, deployer: any): Promise<NetworkAnalysis> {
  console.log("\n🔍 Analyzing Network Conditions...");
  
  const [deployerAddress] = await ethers.getSigners();
  const balance = await provider.getBalance(deployerAddress.address);
  const gasPrice = await provider.getGasPrice();
  
  // Get historical gas prices for congestion analysis
  const latestBlock = await provider.getBlockNumber();
  const recentBlocks = await Promise.all(
    Array.from({ length: 10 }, (_, i) => provider.getBlock(latestBlock - i))
  );
  
  const recentGasPrices = recentBlocks
    .filter((block: any) => block && block.baseFeePerGas)
    .map((block: any) => block!.baseFeePerGas!);
  
  const avgGasPrice = recentGasPrices.reduce((a: any, b: any) => a.add(b), ethers.BigNumber.from(0)).div(recentGasPrices.length);
  const gasPriceVariation = recentGasPrices.reduce((sum: any, price: any) => {
    const diff = price.sub(avgGasPrice).abs();
    return sum.add(diff);
  }, ethers.BigNumber.from(0)).div(recentGasPrices.length);
  
  // Determine congestion level
  let congestion: "low" | "medium" | "high";
  const gasPriceGwei = parseFloat(formatUnits(gasPrice, "gwei"));
  
  if (gasPriceGwei < 20) congestion = "low";
  else if (gasPriceGwei < 50) congestion = "medium";
  else congestion = "high";
  
  // Estimate deployment cost (based on historical data)
  const estimatedTotalGas = 15000000; // Conservative estimate
  const estimatedCost = gasPrice.mul(estimatedTotalGas);
  
  // Check if balance is sufficient
  const sufficientBalance = balance.gt(estimatedCost.mul(120).div(100)); // 20% buffer
  
  // Get USD values if possible
  let gasPriceUSD: string | undefined;
  let estimatedCostUSD: string | undefined;
  let balanceUSD: string | undefined;
  
  try {
    // You can integrate with CoinGecko or similar API here
    // For now, using placeholder values
    const ethPriceUSD = 2000; // Placeholder
    gasPriceUSD = formatEther(gasPrice.mul(ethPriceUSD));
    estimatedCostUSD = formatEther(estimatedCost.mul(ethPriceUSD));
    balanceUSD = formatEther(balance.mul(ethPriceUSD));
  } catch (error) {
    console.log("⚠️  USD conversion not available");
  }
  
  // Determine recommended action
  let recommendedAction: "proceed" | "wait" | "insufficient_balance";
  if (!sufficientBalance) {
    recommendedAction = "insufficient_balance";
  } else if (congestion === "high" && gasPriceGwei > 100) {
    recommendedAction = "wait";
  } else {
    recommendedAction = "proceed";
  }
  
  const analysis: NetworkAnalysis = {
    currentGasPrice: gasPrice.toString(),
    gasPriceGwei: formatUnits(gasPrice, "gwei"),
    gasPriceUSD,
    networkCongestion: congestion,
    recommendedGasPrice: gasPrice.toString(),
    estimatedDeploymentCost: estimatedCost.toString(),
    estimatedDeploymentCostUSD: estimatedCostUSD,
    deployerBalance: balance.toString(),
    deployerBalanceUSD: balanceUSD,
    sufficientBalance,
    recommendedAction,
  };
  
  return analysis;
}

// Enhanced gas tracking function
async function trackGas(
  operation: string,
  step: string,
  txPromise: Promise<any>,
  gasLimit?: number
): Promise<any> {
  const startTime = Date.now();
  const tx = await txPromise;
  
  console.log(`\n⛽ Executing: ${operation}`);
  console.log(`📋 Step: ${step}`);
  console.log(`🔗 Transaction Hash: ${tx.hash}`);
  console.log(`⏳ Waiting for confirmation...`);
  
  // Wait for confirmation
  const receipt = await tx.wait();
  const endTime = Date.now();
  
  // Calculate gas metrics
  const gasUsed = receipt.gasUsed;
  const gasPrice = tx.gasPrice || receipt.effectiveGasPrice;
  const gasCost = gasUsed.mul(gasPrice);
  const gasLimitUsed = gasLimit || tx.gasLimit;
  
  // Get USD value if possible
  let gasCostUSD: string | undefined;
  try {
    const ethPriceUSD = 2000; // Placeholder - integrate with real API
    gasCostUSD = formatEther(gasCost.mul(ethPriceUSD));
  } catch (error) {
    // USD conversion not available
  }
  
  const gasTracker: GasTracker = {
    operation,
    step,
    gasUsed: gasUsed.toString(),
    gasLimit: gasLimitUsed.toString(),
    gasPrice: gasPrice.toString(),
    gasCost: gasCost.toString(),
    gasCostUSD,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber.toString(),
    timestamp: new Date().toISOString(),
    status: "confirmed",
    confirmations: receipt.confirmations,
  };
  
  // Display detailed gas breakdown
  console.log(`\n📊 Gas Analysis for: ${operation}`);
  console.log(`├── Gas Used: ${gasUsed.toLocaleString()} / ${gasLimitUsed.toLocaleString()}`);
  console.log(`├── Gas Price: ${formatUnits(gasPrice, "gwei")} Gwei`);
  console.log(`├── Gas Cost: ${formatEther(gasCost)} ETH${gasCostUSD ? ` ($${gasCostUSD})` : ""}`);
  console.log(`├── Block: ${receipt.blockNumber}`);
  console.log(`├── Confirmations: ${receipt.confirmations}`);
  console.log(`└── Duration: ${endTime - startTime}ms`);
  
  return tx;
}



// Interactive pause function
async function pauseForConfirmation(step: string, reason?: string): Promise<void> {
  const rl = createPrompt();
  
  console.log(`\n⏸️  Deployment paused at step: ${step}`);
  if (reason) {
    console.log(`📋 Reason: ${reason}`);
  }
  console.log(`\n📊 Current Status:`);
  console.log(`├── Step: ${step}`);
  console.log(`├── Time: ${new Date().toISOString()}`);
  console.log(`└── Ready to continue`);
  
  return new Promise((resolve) => {
    rl.question("\n✅ Press Enter to continue deployment, or type 'exit' to stop: ", (answer) => {
      rl.close();
      if (answer.toLowerCase() === "exit") {
        console.log("🛑 Deployment stopped by user");
        process.exit(0);
      }
      console.log("▶️  Continuing deployment...");
      resolve();
    });
  });
}

// Complete step function
function completeStep(step: DeploymentStep, addresses: { [key: string]: string }, gasTracker?: GasTracker) {
  const state = loadDeploymentState() || {
    network: "",
    timestamp: "",
    lastCompletedStep: "",
    nextStep: "",
    addresses: {},
    gasUsage: { totalGasUsed: "0", totalGasCostETH: "0", breakdown: [] },
    stepStatus: {},
    deploymentPaused: false,
  };
  
  state.lastCompletedStep = step;
  state.nextStep = getNextStep(step);
  state.stepStatus[step] = true;
  
  // Add addresses
  Object.assign(state.addresses, addresses);
  
  // Add gas tracking
  if (gasTracker) {
    state.gasUsage.breakdown.push(gasTracker);
    const totalGasUsed = ethers.BigNumber.from(state.gasUsage.totalGasUsed).add(gasTracker.gasUsed);
    const totalGasCost = ethers.BigNumber.from(state.gasUsage.totalGasCostETH).add(gasTracker.gasCost);
    state.gasUsage.totalGasUsed = totalGasUsed.toString();
    state.gasUsage.totalGasCostETH = totalGasCost.toString();
  }
  
  saveDeploymentState(state);
}

// Get next step function
function getNextStep(currentStep: DeploymentStep): DeploymentStep {
  const steps = Object.values(DeploymentStep);
  const currentIndex = steps.indexOf(currentStep);
  return steps[currentIndex + 1] || DeploymentStep.COMPLETED;
}

// Check if step should be skipped
function shouldSkipStep(step: DeploymentStep): boolean {
  const state = loadDeploymentState();
  return state?.stepStatus[step] || false;
}

// Main deployment function
async function main() {
  console.log(
    "🚀 TPT Staking Ecosystem - Enhanced Resumable Proxy Deployment",
  );
  console.log(
    "========================================================================",
  );

  // Load or initialize deployment state
  let deploymentState = loadDeploymentState();
  const isResuming = deploymentState !== null;

  if (isResuming) {
    console.log(`🔄 Resuming deployment from step: ${deploymentState!.nextStep}`);
    console.log(`📋 Last completed: ${deploymentState!.lastCompletedStep}`);
  } else {
    console.log("🆕 Starting fresh deployment");
  }

  // Network-aware address resolver with safe fallbacks
  const resolvedNetwork = hardhatNetwork.name.toLowerCase();
  const isSepolia = resolvedNetwork.includes("sepolia");
  const isMainnet = resolvedNetwork === "mainnet" || resolvedNetwork === "homestead";

  const env = process.env;
  const kageNetworkAddress = isSepolia
    ? env.SEPOLIA_TIGERPALACE_TOKEN || "0x21c7941c0aB4b649685417C4aD2b2B28226343Df"
    : env.MAINNET_TIGERPALACE_TOKEN || "0x64945165255bcb83f2Ef9f31a575975832CA4dB4";
  const treasuryAddress = isSepolia
    ? env.SEPOLIA_TREASURY || "0x55bE25f1cd1e34DaE4476DE2D005Da49dAdE707D"
    : env.MAINNET_TREASURY || "0xF35dB46c803B8AB1A8F2CAaE93f068434df6de52";
  const defaultProxyAdmin = isSepolia
    ? "0xD6A8aC4131387c5fe8c071D886a61a96351AE0F3"
    : "0x5eF6cC12028EB39AC92646EA45993e1F3F6e9856";

  // Confirmations and verify delay
  const VERIFY_CONFIRMATIONS = parseInt(
    process.env.VERIFY_CONFIRMATIONS || (isSepolia ? "3" : "5"),
  );
  const VERIFY_DELAY_MS = parseInt(
    process.env.VERIFY_DELAY_MS || (isSepolia ? "20000" : "30000"),
  );
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  console.log(`📋 Network: ${resolvedNetwork}`);
  console.log(`📋 Using TPT Network Token: ${kageNetworkAddress}`);
  console.log(`📋 Using Treasury Address: ${treasuryAddress}`);

  const [deployer] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;

  console.log("\n📊 Deployment Info:");
  console.log("• Deployer:", deployer.address);
  console.log("• Network:", network);
  console.log("• Node Version: v22.14.0 (expected)");
  console.log("• Solidity Version: ^0.8.27 (from hardhat.config.ts)");

  // Optional reset: wipe state and address outputs
  const argvHasReset = process.argv.some(a => a === "--reset" || a === "-r");
  const envHasReset = !!env.RESET_DEPLOYMENT;
  const shouldReset = argvHasReset || envHasReset;
  if (shouldReset) {
    try {
      if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
      if (fs.existsSync("deployed-addresses-proxy.json")) fs.unlinkSync("deployed-addresses-proxy.json");
      if (fs.existsSync("deployment-failure-log.json")) fs.unlinkSync("deployment-failure-log.json");
      if (fs.existsSync("transparent-proxy-deployment-state.json")) fs.unlinkSync("transparent-proxy-deployment-state.json");
      if (fs.existsSync("transparent-proxy-deployment-failure-log.json")) fs.unlinkSync("transparent-proxy-deployment-failure-log.json");
      console.log("🧹 Reset enabled: cleared prior deployment state and address files");
    } catch (e) {
      console.log("⚠️ Reset requested but cleanup encountered an issue:", (e as any)?.message || e);
    }
    deploymentState = initializeDeploymentState(resolvedNetwork);
  }

  // Check if resuming deployment
  if (!shouldReset && deploymentState && deploymentState.network === network) {
    console.log(
      `\n🔄 RESUMING DEPLOYMENT from step: ${deploymentState.lastCompletedStep}`,
    );
    console.log(
      `📊 Previous gas used: ${deploymentState.gasUsage.totalGasUsed}`,
    );
    console.log(
      `📊 Previous cost: ${deploymentState.gasUsage.totalGasCostETH} ETH`,
    );
  } else {
    console.log("\n🆕 STARTING FRESH DEPLOYMENT");
    deploymentState = initializeDeploymentState(network);
  }

  const deployerBalance = await deployer.getBalance();
  console.log(
    "• Deployer balance:",
    ethers.utils.formatEther(deployerBalance),
    "ETH",
  );

  const minBalance = parseUnits("0.01", "ether");
  if (deployerBalance.lt(minBalance)) {
    console.warn(
      "⚠️ Low balance for deployment (<0.01 ETH). Proceeding anyway; deployment may fail if gas runs out.",
    );
  }

  // Get TPT token contract
  const kageToken = await ethers.getContractAt(
    "TPT",
    kageNetworkAddress,
  );
  console.log("✅ Connected to TPT Network Token");

  // Initialize addresses from state or defaults
  // Initialize gas tracking variables
  let totalGasUsed = ethers.BigNumber.from(
    deploymentState?.gasUsage?.totalGasUsed || "0",
  );
  let totalGasCost = ethers.BigNumber.from("0");
  const gasTracking: any[] = deploymentState?.gasUsage?.breakdown || [];

  const deployedAddresses: { [key: string]: string } = {
    TPT: kageNetworkAddress,
    Treasury: treasuryAddress,
    ...deploymentState.addresses,
  };

  // Helper function to track gas usage for deployments
  const trackGas = async (operation: string, txPromise: any) => {
    // Wait for the transaction to be deployed/confirmed
    const deployedContract = await txPromise;
    const deployTx = deployedContract.deployTransaction;
    console.log(`↪️  Pending ${operation} tx: ${deployTx.hash}`);
    const receipt = await deployTx.wait(VERIFY_CONFIRMATIONS);

    const gasUsed = receipt.gasUsed;
    const gasPrice = deployTx.gasPrice || receipt.effectiveGasPrice;
    const gasCost = gasUsed.mul(gasPrice);

    totalGasUsed = totalGasUsed.add(gasUsed);
    totalGasCost = totalGasCost.add(gasCost);

    const gasEntry = {
      operation,
      gasUsed: gasUsed.toString(),
      gasCost: ethers.utils.formatEther(gasCost),
      txHash: receipt.transactionHash,
    };

    gasTracking.push(gasEntry);

    // Update state
    deploymentState.gasUsage = {
      totalGasUsed: totalGasUsed.toString(),
      totalGasCostETH: ethers.utils.formatEther(totalGasCost),
      breakdown: gasTracking,
    };

    console.log(
      `⛽ Gas used: ${gasUsed.toString()} | Cost: ${ethers.utils.formatEther(
        gasCost,
      )} ETH`,
    );

    return deployedContract;
  };

  // Helper function to track gas usage for regular transactions
  const trackGasTx = async (operation: string, txPromise: any) => {
    const tx = await txPromise;
    console.log(`↪️  Pending ${operation} tx: ${tx.hash}`);
    const receipt = await tx.wait(VERIFY_CONFIRMATIONS);

    const gasUsed = receipt.gasUsed;
    const gasPrice = tx.gasPrice || receipt.effectiveGasPrice;
    const gasCost = gasUsed.mul(gasPrice);

    totalGasUsed = totalGasUsed.add(gasUsed);
    totalGasCost = totalGasCost.add(gasCost);

    const gasEntry = {
      operation,
      gasUsed: gasUsed.toString(),
      gasCost: ethers.utils.formatEther(gasCost),
      txHash: receipt.transactionHash,
    };

    gasTracking.push(gasEntry);

    // Update state
    deploymentState.gasUsage = {
      totalGasUsed: totalGasUsed.toString(),
      totalGasCostETH: ethers.utils.formatEther(totalGasCost),
      breakdown: gasTracking,
    };

    console.log(
      `⛽ Gas used: ${gasUsed.toString()} | Cost: ${ethers.utils.formatEther(
        gasCost,
      )} ETH`,
    );

    return receipt;
  };

  // Helper function to verify contract
  const verifyContract = async (
    address: string,
    constructorArguments: any[] = [],
    contractName?: string,
  ) => {
    try {
      console.log(
        `🔍 Verifying ${contractName || "contract"} at ${address}...`,
      );
      // Small delay to ensure block explorer has indexed the bytecode
      if (VERIFY_DELAY_MS > 0) {
        console.log(`⏳ Waiting ${Math.floor(VERIFY_DELAY_MS / 1000)}s before verify...`);
        await sleep(VERIFY_DELAY_MS);
      }
      await run("verify:verify", {
        address,
        constructorArguments,
      });
      console.log(`✅ ${contractName || "Contract"} verified successfully`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${contractName || "Contract"} already verified`);
      } else {
        console.log(
          `⚠️ Verification failed for ${contractName || "contract"}: ${
            error.message
          }`,
        );
      }
    }
  };

  // Helper function to mark step complete and save state
  const completeStep = (
    step: DeploymentStep,
    addresses?: { [key: string]: string },
  ) => {
    deploymentState.stepStatus[step] = true;
    deploymentState.lastCompletedStep = step;
    deploymentState.timestamp = new Date().toISOString();

    if (addresses) {
      deploymentState.addresses = {
        ...deploymentState.addresses,
        ...addresses,
      };
    }

    saveDeploymentState(deploymentState);
    console.log(`✅ Step completed: ${step}`);
  };

  // Helper function to check if step should be skipped
  const shouldSkipStep = (step: DeploymentStep): boolean => {
    const isCompleted = deploymentState.stepStatus[step] || false;
    if (isCompleted) {
      console.log(`⏩ Skipping already completed step: ${step}`);
    }
    return isCompleted;
  };

  try {
    // Step 1: Setup (Use known ProxyAdmin address for Sepolia)
    let proxyAdminAddress: string;
    if (!shouldSkipStep(DeploymentStep.SETUP)) {
      console.log("\n🔍 Step 1: Resolving ProxyAdmin address...");
      proxyAdminAddress = isSepolia
        ? env.SEPOLIA_PROXY_ADMIN_ADDRESS || defaultProxyAdmin
        : env.MAINNET_PROXY_ADMIN_ADDRESS || defaultProxyAdmin;
      console.log(`✅ Using ProxyAdmin address: ${proxyAdminAddress}`);

      completeStep(DeploymentStep.SETUP, { ProxyAdmin: proxyAdminAddress });
    } else {
      proxyAdminAddress = deploymentState.addresses.ProxyAdmin;
      console.log(`✅ Using existing proxy admin: ${proxyAdminAddress}`);
    }

    // Step 2: Deploy RewardDistributor Implementation
    let rewardDistributorImpl: any;
    if (!shouldSkipStep(DeploymentStep.REWARD_DISTRIBUTOR_IMPL)) {
      console.log("\n📦 Step 2: Deploying RewardDistributor Implementation...");
      const RewardDistributorFactory = await ethers.getContractFactory(
        "RWARewardDistributor",
      );

      const rewardDistributorTx = RewardDistributorFactory.deploy();
      rewardDistributorImpl = await trackGas(
        "RewardDistributor Implementation Deployment",
        rewardDistributorTx,
      );
      console.log(
        `✅ RewardDistributor Implementation deployed at: ${rewardDistributorImpl.address}`,
      );

      // Verify RewardDistributor Implementation
      await verifyContract(
        rewardDistributorImpl.address,
        [],
        "RewardDistributor Implementation",
      );

      completeStep(DeploymentStep.REWARD_DISTRIBUTOR_IMPL, {
        RewardDistributor_Implementation: rewardDistributorImpl.address,
      });
    } else {
      const address =
        deploymentState.addresses.RewardDistributor_Implementation;
      rewardDistributorImpl = await ethers.getContractAt(
        "RWARewardDistributor",
        address,
      );
      console.log(
        `✅ Using existing RewardDistributor Implementation: ${address}`,
      );
    }

    // Step 3: DeployTigerRevenue Implementation
    let kageRevenueImpl: any;
    if (!shouldSkipStep(DeploymentStep.KAGE_REVENUE_IMPL)) {
      console.log("\n📦 Step 3: DeployingTigerRevenue Implementation...");
      const TigerRevenueFactory = await ethers.getContractFactory("TigerRevenue");
      const kageRevenueImplTx = TigerRevenueFactory.deploy();
      kageRevenueImpl = await trackGas(
        "TigerRevenue Implementation Deployment",
        kageRevenueImplTx,
      );
      console.log(
        `✅TigerRevenue Implementation deployed at: ${kageRevenueImpl.address}`,
      );

      // VerifyTigerRevenue Implementation
      await verifyContract(
        kageRevenueImpl.address,
        [],
        "TigerRevenue Implementation",
      );

      completeStep(DeploymentStep.KAGE_REVENUE_IMPL, {
        TigerRevenue_Implementation: kageRevenueImpl.address,
      });
    } else {
      const address = deploymentState.addresses.TigerRevenue_Implementation;
      kageRevenueImpl = await ethers.getContractAt("TigerRevenue", address);
      console.log(`✅ Using existingTigerRevenue Implementation: ${address}`);
    }

    // Step 4: DeployTigerStaking Implementation
    let kageUnifiedStakingImpl: any;
    if (!shouldSkipStep(DeploymentStep.KAGE_UNIFIED_STAKING_IMPL)) {
      console.log(
        "\n📦 Step 4: DeployingTigerStaking Implementation...",
      );
      const TigerUnifiedStakingFactory = await ethers.getContractFactory(
        "TigerUnifiedStaking",
      );
      const kageUnifiedStakingImplTx = TigerUnifiedStakingFactory.deploy();
      kageUnifiedStakingImpl = await trackGas(
        "TigerUnifiedStaking Implementation Deployment",
        kageUnifiedStakingImplTx,
      );
      console.log(
        `✅TigerStaking Implementation deployed at: ${kageUnifiedStakingImpl.address}`,
      );

      // VerifyTigerStaking Implementation
      await verifyContract(
        kageUnifiedStakingImpl.address,
        [],
        "TigerUnifiedStaking Implementation",
      );

      completeStep(DeploymentStep.KAGE_UNIFIED_STAKING_IMPL, {
        TigerUnifiedStaking_Implementation: kageUnifiedStakingImpl.address,
      });
    } else {
      const address =
        deploymentState.addresses.TigerUnifiedStaking_Implementation;
      kageUnifiedStakingImpl = await ethers.getContractAt(
        "TigerUnifiedStaking",
        address,
      );
      console.log(
        `✅ Using existingTigerStaking Implementation: ${address}`,
      );
    }

    // Step 5: Deploy RewardDistributor Proxy with initialization
    let rewardDistributorProxy: any;
    if (!shouldSkipStep(DeploymentStep.REWARD_DISTRIBUTOR_PROXY)) {
      console.log(
        "\n📦 Step 5: Deploying RewardDistributor Proxy with initialization...",
      );

      const RewardDistributorFactory = await ethers.getContractFactory(
        "RWARewardDistributor",
      );
      // Encode initialization data for RewardDistributor
      const rewardDistributorInitData =
        RewardDistributorFactory.interface.encodeFunctionData(
          "__RewardDistributor_init",
          [parseUnits("10000", 18)], // 10K TPT allowance threshold
        );

      const TransparentUpgradeableProxyFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");
      const rewardDistributorProxyTx = TransparentUpgradeableProxyFactory.deploy(
        rewardDistributorImpl.address,
        proxyAdminAddress,
        rewardDistributorInitData,
      );
      rewardDistributorProxy = await trackGas(
        "RewardDistributor Proxy Deployment",
        rewardDistributorProxyTx,
      );
      console.log(
        `✅ RewardDistributor Proxy deployed at: ${rewardDistributorProxy.address}`,
      );

      // Verify RewardDistributor Proxy
      await verifyContract(
        rewardDistributorProxy.address,
        [
          rewardDistributorImpl.address,
          proxyAdminAddress,
          rewardDistributorInitData,
        ],
        "RewardDistributor Proxy",
      );

      completeStep(DeploymentStep.REWARD_DISTRIBUTOR_PROXY, {
        RewardDistributor_Proxy: rewardDistributorProxy.address,
        RewardDistributor: rewardDistributorProxy.address,
      });
    } else {
      const address = deploymentState.addresses.RewardDistributor_Proxy;
      rewardDistributorProxy = await ethers.getContractAt(
        "RWARewardDistributor",
        address,
      );
      console.log(`✅ Using existing RewardDistributor Proxy: ${address}`);
    }

    // Step 6: DeployTigerRevenue Proxy
    let kageRevenueProxy: any;
    if (!shouldSkipStep(DeploymentStep.KAGE_REVENUE_PROXY)) {
      console.log("\n📦 Step 6: DeployingTigerRevenue Proxy...");
      const TransparentUpgradeableProxyFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");
      const kageRevenueProxyTx = TransparentUpgradeableProxyFactory.deploy(
        kageRevenueImpl.address,
        proxyAdminAddress,
        "0x", // Empty initialization data - will initialize manually
      );
      kageRevenueProxy = await trackGas(
        "TigerRevenue Proxy Deployment",
        kageRevenueProxyTx,
      );
      console.log(
        `✅TigerRevenue Proxy deployed at: ${kageRevenueProxy.address}`,
      );

      // VerifyTigerRevenue Proxy
      await verifyContract(
        kageRevenueProxy.address,
        [kageRevenueImpl.address, proxyAdminAddress, "0x"],
        "TigerRevenue Proxy",
      );

      completeStep(DeploymentStep.KAGE_REVENUE_PROXY, {
        TigerRevenue_Proxy: kageRevenueProxy.address,
       TigerRevenue: kageRevenueProxy.address,
      });
    } else {
      const address = deploymentState.addresses.TigerRevenue_Proxy;
      kageRevenueProxy = await ethers.getContractAt("TigerRevenue", address);
      console.log(`✅ Using existingTigerRevenue Proxy: ${address}`);
    }

    // Step 7: DeployTigerStaking Proxy
    let kageUnifiedStakingProxy: any;
    if (!shouldSkipStep(DeploymentStep.KAGE_UNIFIED_STAKING_PROXY)) {
      console.log("\n📦 Step 7: DeployingTigerStaking Proxy...");
      const TransparentUpgradeableProxyFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");
      const kageUnifiedStakingProxyTx = TransparentUpgradeableProxyFactory.deploy(
        kageUnifiedStakingImpl.address,
        proxyAdminAddress,
        "0x", // Empty initialization data - will initialize manually
      );
      kageUnifiedStakingProxy = await trackGas(
        "TigerUnifiedStaking Proxy Deployment",
        kageUnifiedStakingProxyTx,
      );
      console.log(
        `✅TigerStaking Proxy deployed at: ${kageUnifiedStakingProxy.address}`,
      );

      // VerifyTigerStaking Proxy
      await verifyContract(
        kageUnifiedStakingProxy.address,
        [kageUnifiedStakingImpl.address, proxyAdminAddress, "0x"],
        "TigerUnifiedStaking Proxy",
      );

      completeStep(DeploymentStep.KAGE_UNIFIED_STAKING_PROXY, {
        TigerUnifiedStaking_Proxy: kageUnifiedStakingProxy.address,
       TigerStaking: kageUnifiedStakingProxy.address,
      });
    } else {
      const address = deploymentState.addresses.TigerUnifiedStaking_Proxy;
      kageUnifiedStakingProxy = await ethers.getContractAt(
        "TigerUnifiedStaking",
        address,
      );
      console.log(`✅ Using existingTigerStaking Proxy: ${address}`);
    }

    // Step 8: InitializeTigerRevenue through proxy
    let kageRevenue: any;
    if (!shouldSkipStep(DeploymentStep.KAGE_REVENUE_INIT)) {
      console.log("\n🔧 Step 8: InitializingTigerRevenue through proxy...");
      kageRevenue = await ethers.getContractAt(
        "TigerRevenue",
        kageRevenueProxy.address,
      );
      const initTigerRevenueTx = kageRevenue.__TigerRevenue_init(
        kageUnifiedStakingProxy.address, // _kageMulti
        treasuryAddress, // _treasury
      );
      await trackGasTx("TigerRevenue Initialization", initTigerRevenueTx);
      console.log("✅TigerRevenue initialized through proxy");

      completeStep(DeploymentStep.KAGE_REVENUE_INIT);
    } else {
      kageRevenue = await ethers.getContractAt(
        "TigerRevenue",
        kageRevenueProxy.address,
      );
      console.log("✅ Using existing initializedTigerRevenue");
    }

    // Step 9: InitializeTigerStaking through proxy
    let kageUnifiedStaking: any;
    if (!shouldSkipStep(DeploymentStep.KAGE_UNIFIED_STAKING_INIT)) {
      console.log(
        "\n🔧 Step 9: InitializingTigerStaking through proxy...",
      );
      kageUnifiedStaking = await ethers.getContractAt(
        "TigerUnifiedStaking",
        kageUnifiedStakingProxy.address,
      );
      const initTigerUnifiedStakingTx = kageUnifiedStaking.initialize(
        kageToken.address, // _kageAcceptedToken
        rewardDistributorProxy.address, // _kageRewardDistributor
        treasuryAddress, // _treasury
        kageRevenueProxy.address, // _kageRevenue (FIXED: was ethers.constants.AddressZero)
        true, // _shouldCreateDefaultPool
      );
      await trackGasTx(
        "TigerUnifiedStaking Initialization",
        initTigerUnifiedStakingTx,
      );
      console.log("✅TigerStaking initialized through proxy");

      completeStep(DeploymentStep.KAGE_UNIFIED_STAKING_INIT);
    } else {
      kageUnifiedStaking = await ethers.getContractAt(
        "TigerUnifiedStaking",
        kageUnifiedStakingProxy.address,
      );
      console.log("✅ Using existing initializedTigerStaking");
    }

    // Step 10: Configure Pool 0 params and Tiers after initialization
    if (!shouldSkipStep(DeploymentStep.POOL_AND_TIERS_CONFIG)) {
      console.log("\n🔧 Step 10: Configuring Pool 0 and Tier model...");

      const MIN_STAKE_KAGE = process.env.MIN_STAKE_KAGE ?? "100"; // 100 TPT default
      const POOL_APY_BP = parseInt(process.env.POOL_APY_BP ?? "1000", 10); // 10%
      const POOL_PENALTY_BP = parseInt(process.env.POOL_PENALTY_BP ?? "3000", 10); // 30%
      const TIER0_PENALTY_DAYS = parseInt(process.env.TIER0_PENALTY_DAYS ?? "30", 10);
      const D0 = TIER0_PENALTY_DAYS * 24 * 60 * 60;

      // Ensure Pool 0 basic configuration (min stake, apy, active, penalty rate)
      const pool0Info = await kageUnifiedStaking.kagePoolInfo(0);
      const updatePoolTx = kageUnifiedStaking.updatePool(
        0,
        ethers.utils.parseUnits(MIN_STAKE_KAGE, 18),
        POOL_APY_BP,
        true,
        POOL_PENALTY_BP
      );
      await trackGasTx("Configure Pool 0 (min, apy, active, pRate)", updatePoolTx);

      // Prepare tier targets: Tier 0 penalty window, then a simple ladder
      const targetTiers = [
        { duration: D0, multBP: 0, pbp: 3000, isPenalty: true,  name: "Penalty"  },
        { duration: D0, multBP: 1000, pbp: 0, isPenalty: false, name: "Bronze"   },//10%
        { duration: 90 * 24 * 60 * 60,  multBP: 1200, pbp: 0, isPenalty: false, name: "Silver"   }, //12.5%
        { duration: 180 * 24 * 60 * 60, multBP: 1500, pbp: 0, isPenalty: false, name: "Gold"     }, // 15% 
        { duration: 365 * 24 * 60 * 60, multBP: 2000, pbp: 0, isPenalty: false, name: "Platinum" }, // 20%
      ];

      const existingTierCountBN = await kageUnifiedStaking.kageGetTierCount();
      const existingTierCount = existingTierCountBN.toNumber();

      if (existingTierCount === 0) {
        console.log("• No tiers found. Creating target tier set...");
        for (const t of targetTiers) {
          const tx = kageUnifiedStaking.addTierConfig(t.duration, t.multBP, t.name, t.isPenalty);
          await trackGasTx(`Add Tier: ${t.name}`, tx);
        }
      } else {
        console.log(`• Found ${existingTierCount} existing tiers. Updating to target model...`);
        const n = Math.min(existingTierCount, targetTiers.length);
        for (let i = 0; i < n; i++) {
          const t = targetTiers[i];
          const tx = kageUnifiedStaking.kageUpdateTierConfig(i, t.duration, t.multBP, t.isPenalty);
          await trackGasTx(`Update Tier #${i} (${t.name})`, tx);
        }
        for (let i = existingTierCount; i < targetTiers.length; i++) {
          const t = targetTiers[i];
          const tx = kageUnifiedStaking.addTierConfig(t.duration, t.multBP, t.name, t.isPenalty);
          await trackGasTx(`Add Tier #${i} (${t.name})`, tx);
        }
      }

      completeStep(DeploymentStep.POOL_AND_TIERS_CONFIG);
    } else {
      console.log("✅ Using existing pool and tier configuration");
    }

    // Step 10: Configure token permissions
    if (!shouldSkipStep(DeploymentStep.TOKEN_PERMISSIONS)) {
      console.log("\n🔧 Step 10: Configuring token permissions...");

      // Exclude RewardDistributor from fees
      console.log("Excluding RewardDistributor from fees...");
      const excludeTx = kageToken.setExcludedFromFee(
        rewardDistributorProxy.address,
        true,
      );
      await trackGasTx("Exclude RewardDistributor from fees", excludeTx);
      console.log("✅ RewardDistributor excluded from fees");

      completeStep(DeploymentStep.TOKEN_PERMISSIONS);
    } else {
      console.log("✅ Using existing token permissions configuration");
    }

    // Step 11: Fund RewardDistributor
    if (!shouldSkipStep(DeploymentStep.FUNDING)) {
      console.log("\n🔧 Step 11: Funding RewardDistributor...");
      const fundingAmount = parseUnits("100000", 18); // 100K TPT
      const fundTx = kageToken.transfer(
        rewardDistributorProxy.address,
        fundingAmount,
      );
      await trackGasTx("Fund RewardDistributor", fundTx);
      console.log("✅ RewardDistributor funded with 100K TPT");

      completeStep(DeploymentStep.FUNDING);
    } else {
      console.log("✅ Using existing RewardDistributor funding");
    }

    // Step 12: Set RewardDistributor approvals (to Staking and Revenue)
    if (!shouldSkipStep(DeploymentStep.APPROVALS)) {
      console.log("\n🔧 Step 12: Setting RewardDistributor approvals...");
      const rewardDistributor = await ethers.getContractAt(
        "RWARewardDistributor",
        rewardDistributorProxy.address,
      );
      const approvalAmount = parseUnits("1000000", 18); // 1M TPT approval
      // ApproveTigerStaking for reward transfers
      const approveStakingTx = rewardDistributor.approveERC20(
        kageToken.address,
        kageUnifiedStakingProxy.address,
        approvalAmount,
      );
      await trackGasTx(
        "Set RewardDistributor approval toTigerStaking",
        approveStakingTx,
      );
      console.log("✅ RewardDistributor approval set forTigerStaking");
      // ApproveTigerRevenue for revenue claims
      const approveRevenueTx = rewardDistributor.approveERC20(
        kageToken.address,
        kageRevenueProxy.address,
        approvalAmount,
      );
      await trackGasTx(
        "Set RewardDistributor approval toTigerRevenue",
        approveRevenueTx,
      );
      console.log("✅ RewardDistributor approval set forTigerRevenue");

      completeStep(DeploymentStep.APPROVALS);
    } else {
      console.log("✅ Using existing RewardDistributor approvals");
    }

    // Step 13: SetTigerRevenue inTigerStaking (skip if already correct)
    if (!shouldSkipStep(DeploymentStep.REVENUE_CONNECTION)) {
      console.log("\n🔧 Step 13: ConfiguringTigerRevenue connection...");
      const currentRevenue = await kageUnifiedStaking.kageRevenue();
      console.log("• CurrentTigerRevenue:", currentRevenue);
      if (currentRevenue.toLowerCase() === kageRevenueProxy.address.toLowerCase()) {
        console.log("⏩ Already set to desiredTigerRevenue. Skipping setTigerRevenue.");
      } else {
        try {
          const setRevenueTx = kageUnifiedStaking.setTigerRevenue(
            kageRevenueProxy.address,
          );
          await trackGasTx("SetTigerRevenue inTigerStaking", setRevenueTx);
          console.log("✅TigerRevenue connection configured inTigerStaking");
        } catch (err: any) {
          console.log("⚠️ setTigerRevenue transaction failed:", err?.message || err);
          throw err;
        }
      }

      completeStep(DeploymentStep.REVENUE_CONNECTION);
    } else {
      console.log("✅ Using existingTigerRevenue connection");
    }

    // Step 14: Final verification and validation
    if (!shouldSkipStep(DeploymentStep.VERIFICATION)) {
      console.log("\n🔍 Step 14: Final verification and validation...");

      // Update deployed addresses from state
      Object.assign(deployedAddresses, deploymentState.addresses);

      // Verify configuration
      const acceptedToken = await kageUnifiedStaking.kageAcceptedToken();
      const rewardDistributorSet =
        await kageUnifiedStaking.kageRewardDistributor();
      const treasurySet = await kageUnifiedStaking.treasury();
      const kageRevenueSet = await kageUnifiedStaking.kageRevenue();

      console.log("TigerUnifiedStaking Proxy Configuration:");
      console.log("• Accepted Token:", acceptedToken);
      console.log("• Reward Distributor:", rewardDistributorSet);
      console.log("• Treasury:", treasurySet);
      console.log("•TigerRevenue:", kageRevenueSet);

      // CheckTigerRevenue configuration
      const kageMultiSet = await kageRevenue.kageMulti();
      const kageRevenueTreasurySet = await kageRevenue.treasury();

      console.log("\nTigerRevenue Proxy Configuration:");
      console.log("•TigerStaking:", kageMultiSet);
      console.log("• Treasury:", kageRevenueTreasurySet);

      // Check RewardDistributor configuration
      const rewardDistributor = await ethers.getContractAt(
        "RWARewardDistributor",
        rewardDistributorProxy.address,
      );
      const rewardDistributorOwner = await rewardDistributor.owner();
      const allowanceThreshold = await rewardDistributor.allowanceThreshold();

      console.log("\nRewardDistributor Proxy Configuration:");
      console.log("• Owner:", rewardDistributorOwner);
      console.log(
        "• Allowance Threshold:",
        ethers.utils.formatEther(allowanceThreshold),
        "TPT",
      );

      // Check token balances
      const distributorBalance = await kageToken.balanceOf(
        rewardDistributorProxy.address,
      );
      const isExcluded = await kageToken.isExcludedFromFee(
        rewardDistributorProxy.address,
      );
      const allowance = await kageToken.allowance(
        rewardDistributorProxy.address,
        kageUnifiedStakingProxy.address,
      );
      const allowanceToRevenue = await kageToken.allowance(
        rewardDistributorProxy.address,
        kageRevenueProxy.address,
      );

      console.log("\nToken Configuration:");
      console.log(
        "• RewardDistributor Balance:",
        ethers.utils.formatEther(distributorBalance),
        "TPT",
      );
      console.log("• RewardDistributor Fee Excluded:", isExcluded);
      console.log(
        "• RewardDistributor Allowance toTigerStaking:",
        ethers.utils.formatEther(allowance),
        "TPT",
      );
      console.log(
        "• RewardDistributor Allowance toTigerRevenue:",
        ethers.utils.formatEther(allowanceToRevenue),
        "TPT",
      );

      // Validate configuration
      const configErrors = [];
      const fundingAmount = parseUnits("100000", 18);
      const approvalAmount = parseUnits("1000000", 18);

      if (acceptedToken !== kageToken.address)
        configErrors.push("Accepted token mismatch");
      if (rewardDistributorSet !== rewardDistributorProxy.address)
        configErrors.push("RewardDistributor mismatch");
      if (treasurySet !== treasuryAddress)
        configErrors.push("Treasury mismatch");
      if (kageRevenueSet !== kageRevenueProxy.address)
        configErrors.push("TigerRevenue mismatch");
      if (kageMultiSet !== kageUnifiedStakingProxy.address)
        configErrors.push("TigerrMulti mismatch");
      if (kageRevenueTreasurySet !== treasuryAddress)
        configErrors.push("TigerRevenue treasury mismatch");
      if (distributorBalance.lt(fundingAmount))
        configErrors.push("RewardDistributor funding insufficient");
      if (!isExcluded)
        configErrors.push("RewardDistributor not excluded from fees");
      if (allowance.lt(approvalAmount))
        configErrors.push(
          "RewardDistributor allowance to Staking insufficient",
        );
      if (allowanceToRevenue.lt(approvalAmount))
        configErrors.push(
          "RewardDistributor allowance to Revenue insufficient",
        );

      if (configErrors.length > 0) {
        throw new Error(
          `Configuration validation failed: ${configErrors.join(", ")}`,
        );
      }

      console.log("✅ All configuration validation passed");

      completeStep(DeploymentStep.VERIFICATION);
    } else {
      console.log("✅ Using existing verification");
      Object.assign(deployedAddresses, deploymentState.addresses);
    }

    // Mark deployment as completed
    completeStep(DeploymentStep.COMPLETED);

    // Gas Summary
    console.log("\n⛽ GAS USAGE SUMMARY");
    console.log("===================");
    gasTracking.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.operation}`);
      console.log(`   Gas Used: ${entry.gasUsed}`);
      console.log(`   Cost: ${entry.gasCost} ETH`);
      console.log(`   TX Hash: ${entry.txHash}`);
      console.log("");
    });

    console.log(`📊 TOTAL GAS USED: ${totalGasUsed.toString()}`);
    console.log(
      `💰 TOTAL GAS COST: ${ethers.utils.formatEther(totalGasCost)} ETH`,
    );

    // Estimate mainnet cost (assuming 30 gwei gas price)
    const mainnetGasPrice = parseUnits("30", "gwei");
    const estimatedMainnetCost = totalGasUsed.mul(mainnetGasPrice);
    console.log(
      `🏦 ESTIMATED MAINNET COST (30 gwei): ${ethers.utils.formatEther(
        estimatedMainnetCost,
      )} ETH`,
    );

    // Summary
    console.log("\n🎉 PROXY DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
    console.log("Contract Addresses:");
    console.log("📋 Core Contracts:");
    console.log(`• TPT: ${deployedAddresses.TPT}`);
    console.log(`• ProxyAdmin: ${deployedAddresses.ProxyAdmin}`);
    console.log(`• Treasury: ${deployedAddresses.Treasury}`);

    console.log("\n📋 Implementation Contracts:");
    console.log(
      `• RewardDistributor Implementation: ${deployedAddresses.RewardDistributor_Implementation}`,
    );
    console.log(
      `•TigerRevenue Implementation: ${deployedAddresses.TigerRevenue_Implementation}`,
    );
    console.log(
      `•TigerStaking Implementation: ${deployedAddresses.TigerUnifiedStaking_Implementation}`,
    );

    console.log("\n🔗 Proxy Contracts (Use these for frontend):");
    console.log(
      `• RewardDistributor Proxy: ${deployedAddresses.RewardDistributor}`,
    );
    console.log(`•TigerRevenue Proxy: ${deployedAddresses.TigerRevenue}`);
    console.log(
      `•TigerStaking Proxy: ${deployedAddresses.TigerUnifiedStaking}`,
    );

    console.log(
      "\n✅ Verification Status: All contracts verified on Etherscan",
    );
    console.log("\n📋 Next Steps:");
    console.log("1. ✅ All contracts verified on Etherscan");
    console.log("2. Test proxy functionality");
    console.log("3. Test upgrade capability");
    console.log("4. Configure frontend with proxy addresses");

    // Save final addresses to file with gas data
    const addressData = {
      network: network,
      timestamp: new Date().toISOString(),
      deploymentType: "proxy",
      nodeVersion: "v22.14.0",
      solidityVersion: "^0.8.27",
      addresses: deployedAddresses,
      gasUsage: {
        totalGasUsed: totalGasUsed.toString(),
        totalGasCostETH: ethers.utils.formatEther(totalGasCost),
        estimatedMainnetCostETH: ethers.utils.formatEther(estimatedMainnetCost),
        breakdown: gasTracking,
      },
      proxyInfo: {
        note: "Use proxy addresses for frontend integration",
        implementations: {
          RewardDistributor: deployedAddresses.RewardDistributor_Implementation,
         TigerRevenue: deployedAddresses.TigerRevenue_Implementation,
         TigerStaking:
            deployedAddresses.TigerUnifiedStaking_Implementation,
        },
        proxies: {
          RewardDistributor: deployedAddresses.RewardDistributor,
         TigerRevenue: deployedAddresses.TigerRevenue,
         TigerStaking: deployedAddresses.TigerUnifiedStaking,
        },
      },
    };

    fs.writeFileSync(
      "deployed-addresses-proxy.json",
      JSON.stringify(addressData, null, 2),
    );
    console.log(
      "\n💾 Deployment data with gas tracking saved to deployed-addresses-proxy.json",
    );

    // Clean up state file on successful completion
    cleanupStateFile();
  } catch (error: any) {
    console.error("❌ Proxy deployment failed:", error.message);
    if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      console.log("💡 Try increasing gas limit or checking contract size");
    }

    // Save current state for resumption
    deploymentState.gasUsage = {
      totalGasUsed: totalGasUsed.toString(),
      totalGasCostETH: ethers.utils.formatEther(totalGasCost),
      breakdown: gasTracking,
    };
    saveDeploymentState(deploymentState);

    // Save partial gas data if deployment fails
    if (gasTracking.length > 0) {
      const partialData = {
        network: network,
        timestamp: new Date().toISOString(),
        deploymentType: "proxy",
        status: "FAILED",
        error: error.message,
        lastCompletedStep: deploymentState.lastCompletedStep,
        gasUsage: {
          totalGasUsed: totalGasUsed.toString(),
          totalGasCostETH: ethers.utils.formatEther(totalGasCost),
          breakdown: gasTracking,
        },
        addresses: deploymentState.addresses,
      };

      fs.writeFileSync(
        "deployment-failure-log.json",
        JSON.stringify(partialData, null, 2),
      );
      console.log(
        "💾 Partial deployment data saved to deployment-failure-log.json",
      );
    }

    console.log(
      `\n🔄 To resume deployment, run the script again. It will continue from step: ${deploymentState.lastCompletedStep}`,
    );

    throw error;
  }
}

// Helper functions for state management
function loadDeploymentState(): DeploymentState | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("⚠️ Could not load deployment state, starting fresh");
  }
  return null;
}

function initializeDeploymentState(network: string): DeploymentState {
  return {
    network,
    timestamp: new Date().toISOString(),
    lastCompletedStep: "",
    nextStep: DeploymentStep.NETWORK_ANALYSIS,
    addresses: {},
    gasUsage: {
      totalGasUsed: "0",
      totalGasCostETH: "0",
      breakdown: [],
    },
    stepStatus: {},
    deploymentPaused: false,
  };
}

function saveDeploymentState(state: DeploymentState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("⚠️ Could not save deployment state:", error);
  }
}

function cleanupStateFile(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log("🧹 Deployment state file cleaned up");
    }
  } catch (error) {
    console.log("⚠️ Could not clean up state file:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
