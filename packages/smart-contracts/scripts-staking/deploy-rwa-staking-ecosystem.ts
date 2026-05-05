import hre from "hardhat";
const { ethers } = hre as any;
import { BigNumberish, Contract, formatEther, formatUnits, parseEther } from "ethers";
import fs from "fs";
import path from "path";
import hre1 from "hardhat";
const { run } = hre1 as any;

// Deployment step tracking
enum DeploymentStep {
  NETWORK_ANALYSIS = "NETWORK_ANALYSIS",
  TOKEN_DEPLOYMENT = "TOKEN_DEPLOYMENT",
  REWARD_DISTRIBUTOR_DEPLOYMENT = "REWARD_DISTRIBUTOR_DEPLOYMENT",
  REVENUE_DEPLOYMENT = "REVENUE_DEPLOYMENT",
  STAKING_DEPLOYMENT = "STAKING_DEPLOYMENT",
  PROXY_DEPLOYMENT = "PROXY_DEPLOYMENT",
  INITIALIZATION = "INITIALIZATION",
  CONFIGURATION = "CONFIGURATION",
  FUNDING = "FUNDING",
  VERIFICATION = "VERIFICATION",
  COMPLETED = "COMPLETED"
}

// Network-specific addresses
const tigerPalaceNetworkAddress = "0x1234567890123456789012345678901234567890"; // Replace with actual address
const treasuryAddress = "0x9876543210987654321098765432109876543210"; // Replace with actual address

// Deployment state management
interface DeploymentState {
  step: DeploymentStep;
  contracts: {
    tokenizinToken?: string;
    rwaRewardDistributor?: string;
    rwaRevenue?: string;
    TigerStaking?: string;
    proxyAdmin?: string;
  };
  gasUsed: number;
  timestamp: number;
}

const STATE_FILE = "deployed-rwa-staking-ecosystem.json";

async function loadDeploymentState(): Promise<DeploymentState | null> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("No existing deployment state found");
  }
  return null;
}

async function saveDeploymentState(state: DeploymentState): Promise<void> {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function initializeDeploymentState(): Promise<DeploymentState> {
  return {
    step: DeploymentStep.NETWORK_ANALYSIS,
    contracts: {},
    gasUsed: 0,
    timestamp: Date.now()
  };
}

async function cleanupStateFile(): Promise<void> {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

// Gas tracking
async function trackGas(tx: any, operation: string): Promise<number> {
  const receipt = await tx.wait();
  const gasUsed = receipt.gasUsed.toNumber();
  console.log(`⛽ ${operation} gas used: ${gasUsed.toLocaleString()}`);
  return gasUsed;
}

// Network analysis
async function analyzeNetwork(): Promise<void> {
  console.log("🔍 Analyzing network...");
  
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`📦 Current block: ${blockNumber}`);
  
  const gasPrice = await ethers.provider.getFeeData();  
  console.log(`⛽ Gas price: ${formatUnits(gasPrice.gasPrice ?? 0, "gwei")} gwei`);
  console.log(`⛽ Gas price: ${formatUnits(gasPrice.maxFeePerGas ?? 0, "gwei")} gwei`);
  console.log(`⛽ Gas price: ${formatUnits(gasPrice.maxPriorityFeePerGas ?? 0, "gwei")} gwei`);
}

// Pause for confirmation
async function pauseForConfirmation(message: string): Promise<void> {
  console.log(`\n⏸️  ${message}`);
  console.log("Press Enter to continue...");
  await new Promise(resolve => process.stdin.once('data', () => resolve(void 0)));
}

// Contract verification
async function verifyContract(address: string, constructorArgs: any[] = []): Promise<void> {
  try {
    console.log(`🔍 Verifying contract at ${address}...`);
    await run("verify:verify", {
        address: address,
        constructorArguments: constructorArgs
      }
    );
    console.log(`✅ Contract verified successfully`);
  } catch (error) {
    console.log(`⚠️  Verification failed: ${error}`);
  }
}

async function main() {
  console.log("🚀 Starting RWA Staking Ecosystem Deployment");
  console.log("=============================================");

  // Load existing state or initialize
  let state = await loadDeploymentState();
  if (!state) {
    state = await initializeDeploymentState();
  }

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying with account: ${deployer.address}`);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${formatEther(balance)} ETH`);

  if (balance < parseEther("0.1")) {
    throw new Error("Insufficient balance for deployment: " + balance.toString());
  }

  // Network analysis
  if (state.step === DeploymentStep.NETWORK_ANALYSIS) {
    await analyzeNetwork();
    state.step = DeploymentStep.TOKEN_DEPLOYMENT;
    await saveDeploymentState(state);
  }

  // Deploy TigerPalaceToken
  if (state.step === DeploymentStep.TOKEN_DEPLOYMENT) {
    console.log("\n🪙 Deploying TigerPalaceToken...");
    
    const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
    const tokenizinToken = await TigerPalaceToken.deploy(
      deployer.address, // owner
      treasuryAddress,  // treasury
      parseEther("1000000") // 1M initial supply
    );
    
    const tokenGas = await trackGas(await tokenizinToken.deploymentTransaction(), "TigerPalaceToken deployment");
    state.gasUsed += tokenGas;
    state.contracts.tokenizinToken = await tokenizinToken.getAddress();
    
    console.log(`✅ TigerPalaceToken deployed at: ${await tokenizinToken.getAddress()}`);
    
    state.step = DeploymentStep.REWARD_DISTRIBUTOR_DEPLOYMENT;
    await saveDeploymentState(state);
  }

  // Deploy RWARewardDistributor
  if (state.step === DeploymentStep.REWARD_DISTRIBUTOR_DEPLOYMENT) {
    console.log("\n💰 Deploying RWARewardDistributor...");
    
    const RWARewardDistributor = await ethers.getContractFactory("RWARewardDistributor");
    const rwaRewardDistributor = await RWARewardDistributor.deploy(
      state.contracts.tokenizinToken!,
      treasuryAddress,
      parseEther("100000") // 100K initial reward pool
    );
    
    const distributorGas = await trackGas(await rwaRewardDistributor.deploymentTransaction(), "RWARewardDistributor deployment");
    state.gasUsed += distributorGas;
    state.contracts.rwaRewardDistributor = await rwaRewardDistributor.getAddress();
    
    console.log(`✅ RWARewardDistributor deployed at: ${await rwaRewardDistributor.getAddress()}`);
    
    state.step = DeploymentStep.REVENUE_DEPLOYMENT;
    await saveDeploymentState(state);
  }

  // Deploy RWARevenue
  if (state.step === DeploymentStep.REVENUE_DEPLOYMENT) {
    console.log("\n📊 Deploying RWARevenue...");
    
    const RWARevenue = await ethers.getContractFactory("RWARevenue");
    const rwaRevenue = await RWARevenue.deploy(
      state.contracts.tokenizinToken!,
      state.contracts.rwaRewardDistributor!
    );
    
    const revenueGas = await trackGas(await rwaRevenue.deploymentTransaction(), "RWARevenue deployment");
    state.gasUsed += revenueGas;
    state.contracts.rwaRevenue = await rwaRevenue.getAddress();
    
    console.log(`✅ RWARevenue deployed at: ${await rwaRevenue.getAddress()}`);
    
    state.step = DeploymentStep.STAKING_DEPLOYMENT;
    await saveDeploymentState(state);
  }

  // Deploy RWAStaking
  if (state.step === DeploymentStep.STAKING_DEPLOYMENT) {
    console.log("\n🏦 Deploying RWAStaking...");
    
    const RWAStaking = await ethers.getContractFactory("RWAStaking");
    const TigerStaking = await RWAStaking.deploy(
      state.contracts.tokenizinToken!,
      state.contracts.rwaRevenue!,
      state.contracts.rwaRewardDistributor!
    );
    
    const stakingGas = await trackGas(await TigerStaking.deploymentTransaction(), "RWAStaking deployment");
    state.gasUsed += stakingGas;
    state.contracts.TigerStaking = await TigerStaking.getAddress();
    
    console.log(`✅ RWAStaking deployed at: ${await TigerStaking.getAddress()}`);
    
    state.step = DeploymentStep.INITIALIZATION;
    await saveDeploymentState(state);
  }

  // Initialize contracts
  if (state.step === DeploymentStep.INITIALIZATION) {
    console.log("\n🔧 Initializing contracts...");
    
    const rwaRewardDistributor = await ethers.getContractAt("RWARewardDistributor", state.contracts.rwaRewardDistributor!);
    const rwaRevenue = await ethers.getContractAt("RWARevenue", state.contracts.rwaRevenue!);
    const TigerStaking = await ethers.getContractAt("RWAStaking", state.contracts.TigerStaking!);
    
    // Initialize RewardDistributor
    console.log("Initializing RWARewardDistributor...");
    const initDistributorTx = await rwaRewardDistributor.initialize(
      state.contracts.TigerStaking!,
      state.contracts.rwaRevenue!,
      treasuryAddress
    );
    await trackGas(initDistributorTx, "RWARewardDistributor initialization");
    
    // Initialize RWARevenue
    console.log("Initializing RWARevenue...");
    const initRevenueTx = await rwaRevenue.initialize(state.contracts.TigerStaking!);
    await trackGas(initRevenueTx, "RWARevenue initialization");
    
    state.step = DeploymentStep.CONFIGURATION;
    await saveDeploymentState(state);
  }

  // Configure ecosystem
  if (state.step === DeploymentStep.CONFIGURATION) {
    console.log("\n⚙️  Configuring ecosystem...");
    
    const tokenizinToken = await ethers.getContractAt("TigerPalaceToken", state.contracts.tokenizinToken!);
    const rwaRewardDistributor = await ethers.getContractAt("RWARewardDistributor", state.contracts.rwaRewardDistributor!);
    
    // Set reward distributor in token
    console.log("Setting reward distributor in TigerPalaceToken...");
    const setDistributorTx = await tokenizinToken.setRewardDistributor(state.contracts.rwaRewardDistributor!);
    await trackGas(setDistributorTx, "Set reward distributor");
    
    // Update addresses in contracts
    console.log("Updating contract addresses...");
    const updateAddressesTx = await rwaRewardDistributor.updateAddresses(
      state.contracts.TigerStaking!,
      state.contracts.rwaRevenue!,
      treasuryAddress
    );
    await trackGas(updateAddressesTx, "Update addresses");
    
    state.step = DeploymentStep.FUNDING;
    await saveDeploymentState(state);
  }

  // Fund ecosystem
  if (state.step === DeploymentStep.FUNDING) {
    console.log("\n💸 Funding ecosystem...");
    
    const tokenizinToken = await ethers.getContractAt("TigerPalaceToken", state.contracts.tokenizinToken!);
    const rwaRewardDistributor = await ethers.getContractAt("RWARewardDistributor", state.contracts.rwaRewardDistributor!);
    
    // Transfer tokens to reward distributor
    const fundingAmount = parseEther("50000"); // 50K tokens
    console.log(`Transferring ${formatEther(fundingAmount)} TPT to reward distributor...`);
    
    const transferTx = await tokenizinToken.transfer(state.contracts.rwaRewardDistributor!, fundingAmount as BigNumberish);
    await trackGas(await transferTx.wait(), "Token transfer to reward distributor");
    
    // Add rewards to distributor
    console.log("Adding rewards to distributor...");
    const addRewardsTx = await rwaRewardDistributor.addRewards(fundingAmount, "initial_funding");
    await trackGas(await addRewardsTx.wait(), "Add rewards");
    
    state.step = DeploymentStep.VERIFICATION;
    await saveDeploymentState(state);
  }

  // Verify contracts
  if (state.step === DeploymentStep.VERIFICATION) {
    console.log("\n🔍 Verifying contracts...");
    
    try {
      await verifyContract(state.contracts.tokenizinToken!);
      await verifyContract(state.contracts.rwaRewardDistributor!);
      await verifyContract(state.contracts.rwaRevenue!);
      await verifyContract(state.contracts.TigerStaking!);
    } catch (error) {
      console.log("⚠️  Some verifications failed, but deployment completed");
    }
    
    state.step = DeploymentStep.COMPLETED;
    await saveDeploymentState(state);
  }

  // Deployment completed
  if (state.step === DeploymentStep.COMPLETED) {
    console.log("\n🎉 RWA Staking Ecosystem Deployment Completed!");
    console.log("=============================================");
    console.log(`📊 Total gas used: ${state.gasUsed.toLocaleString()}`);
    console.log(`⏱️  Deployment time: ${new Date().toISOString()}`);
    
    console.log("\n📋 Contract Addresses:");
    console.log(`🪙 TigerPalaceToken: ${state.contracts.tokenizinToken}`);
    console.log(`💰 RWARewardDistributor: ${state.contracts.rwaRewardDistributor}`);
    console.log(`📊 RWARevenue: ${state.contracts.rwaRevenue}`);
    console.log(`🏦 RWAStaking: ${state.contracts.TigerStaking}`);
    
    // Save deployment addresses
    const deploymentInfo = {
      network: (await ethers.provider.getNetwork()).name,
      chainId: (await ethers.provider.getNetwork()).chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      gasUsed: state.gasUsed,
      contracts: state.contracts
    };
    
    fs.writeFileSync("rwa-staking-deployment.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to rwa-staking-deployment.json");
    
    // Cleanup state file
    await cleanupStateFile();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
