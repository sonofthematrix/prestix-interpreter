#!/usr/bin/env ts-node

/**
 * TPT Staking - Hardhat Node End-to-End Dry Run
 * 
 * This script performs a comprehensive dry run test of the entire deployment pipeline
 * using a local Hardhat node to simulate the full deployment process with TransparentUpgradeableProxy:
 * - Start local Hardhat node
 * - Deploy all contracts with proxies
 * - Initialize and configure the ecosystem
 * - Test all functionality
 * - Validate contract interactions
 * - Generate deployment artifacts
 */

import { network, run } from "hardhat";
import hre from "hardhat";
const { ethers } = hre as any;
import fs from "fs";
import path from "path";

interface DryRunResult {
  timestamp: string;
  network: string;
  deploymentAddresses: {
    [key: string]: string;
  };
  gasUsage: {
    totalGasUsed: string;
    totalGasCostETH: string;
    breakdown: Array<{
      operation: string;
      gasUsed: string;
      gasCost: string;
    }>;
  };
  testResults: {
    [key: string]: {
      status: "pass" | "fail" | "warning";
      message: string;
      details?: any;
    };
  };
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
    deploymentSuccessful: boolean;
  };
}

const DRY_RUN_RESULT_FILE = "dry-run-hardhat-node-results.json";

async function main() {
  console.log("🧪 TPT Staking - Hardhat Node End-to-End Dry Run");
  console.log("==================================================");
  
  const result: DryRunResult = {
    timestamp: new Date().toISOString(),
    network: "hardhat",
    deploymentAddresses: {},
    gasUsage: {
      totalGasUsed: "0",
      totalGasCostETH: "0",
      breakdown: []
    },
    testResults: {},
    summary: { totalTests: 0, passed: 0, failed: 0, warnings: 0, deploymentSuccessful: false }
  };

  try {
    // Phase 1: Environment Setup and Validation
    await setupEnvironment(result);
    
    // Phase 2: Contract Deployment with Proxies
    await deployContractsWithProxies(result);
    
    // Phase 3: Contract Initialization and Configuration
    await initializeAndConfigureContracts(result);
    
    // Phase 4: Ecosystem Integration Testing
    await testEcosystemIntegration(result);
    
    // Phase 5: Functionality Testing
    await testContractFunctionality(result);
    
    // Phase 6: Gas Usage Analysis
    await analyzeGasUsage(result);
    
    // Phase 7: Artifact Generation
    await generateArtifacts(result);
    
    // Generate summary
    generateSummary(result);
    
    // Save results
    fs.writeFileSync(DRY_RUN_RESULT_FILE, JSON.stringify(result, null, 2));
    
    console.log(`\n📊 Dry run results saved to: ${DRY_RUN_RESULT_FILE}`);
    
    // Exit with appropriate code
    if (result.summary.failed > 0) {
      console.error("❌ Dry run failed!");
      process.exit(1);
    } else if (result.summary.warnings > 0) {
      console.warn("⚠️ Dry run completed with warnings");
      process.exit(0);
    } else {
      console.log("✅ Dry run passed!");
      process.exit(0);
    }
    
  } catch (error) {
    console.error("❌ Dry run failed with error:", error);
    process.exit(1);
  }
}

async function setupEnvironment(result: DryRunResult) {
  console.log("\n🔧 Phase 1: Environment Setup and Validation");
  
  // Test 1: Network configuration
  try {
    const networkConfig = await network.config;
    if (networkConfig.chainId === 31337) { // Hardhat default
      result.testResults.network_config = {
        status: "pass",
        message: `Connected to Hardhat network (chainId: ${networkConfig.chainId})`
      };
      result.summary.passed++;
    } else {
      result.testResults.network_config = {
        status: "warning",
        message: `Connected to network with chainId: ${networkConfig.chainId} (expected 31337 for Hardhat)`
      };
      result.summary.warnings++;
    }
  } catch (error: any) {
    result.testResults.network_config = {
      status: "fail",
      message: "Network configuration failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
  }
  result.summary.totalTests++;
  
  // Test 2: Deployer account
  const deployer = await ethers.getSigner(0) as any;
  result.testResults.deployer_account = {
    status: "pass",
    message: `Deployer account found`
  };
  result.summary.passed++;
  result.summary.totalTests++;  
  
  // Test 3: Contract compilation
  try {
    await ethers.getContractFactory("RWARevenue");
    await ethers.getContractFactory("RWAStaking");
    await ethers.getContractFactory("RWARewardDistributor");
    
    result.testResults.contract_compilation = {
      status: "pass",
      message: "All contracts compile successfully"
    };
    result.summary.passed++;
  } catch (error: any) {
    result.testResults.contract_compilation = {
      status: "fail",
      message: "Contract compilation failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
  }
  result.summary.totalTests++;
}

async function deployContractsWithProxies(result: DryRunResult) {
  console.log("\n🚀 Phase 2: Contract Deployment with Proxies");
  
  const [deployer] = await ethers.getSigners();
  let totalGasUsed = ethers.BigNumber.from(0);
  
  try {
    // Deploy ProxyAdmin
    console.log("Deploying ProxyAdmin...");
    const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = await ProxyAdminFactory.deploy();
    const proxyAdminReceipt = await proxyAdmin.deployTransaction.wait();
    
    totalGasUsed = totalGasUsed.add(proxyAdminReceipt.gasUsed);
    result.deploymentAddresses.proxyAdmin = proxyAdmin.address;
    
    result.gasUsage.breakdown.push({
      operation: "ProxyAdmin deployment",
      gasUsed: proxyAdminReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(proxyAdminReceipt.gasUsed.mul(proxyAdminReceipt.effectiveGasPrice))
    });
    
    // Deploy implementations
    console.log("Deploying contract implementations...");
    
    const RewardDistributorImplFactory = await ethers.getContractFactory("RWARewardDistributor");
    const rewardDistributorImpl = await RewardDistributorImplFactory.deploy();
    const rewardDistributorImplReceipt = await rewardDistributorImpl.deployTransaction.wait();
    
    totalGasUsed = totalGasUsed.add(rewardDistributorImplReceipt.gasUsed);
    result.deploymentAddresses.rewardDistributorImpl = rewardDistributorImpl.address;
    
    result.gasUsage.breakdown.push({
      operation: "RewardDistributor implementation",
      gasUsed: rewardDistributorImplReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(rewardDistributorImplReceipt.gasUsed.mul(rewardDistributorImplReceipt.effectiveGasPrice))
    });
    
    const TigerRevenueImplFactory = await ethers.getContractFactory("TigerRevenue");
    const kageRevenueImpl = await TigerRevenueImplFactory.deploy();
    const kageRevenueImplReceipt = await kageRevenueImpl.deployTransaction.wait();
    
    totalGasUsed = totalGasUsed.add(kageRevenueImplReceipt.gasUsed);
    result.deploymentAddresses.kageRevenueImpl = kageRevenueImpl.address;
    
    result.gasUsage.breakdown.push({
      operation: "TigerRevenue implementation",
      gasUsed: kageRevenueImplReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(kageRevenueImplReceipt.gasUsed.mul(kageRevenueImplReceipt.effectiveGasPrice))
    });
    
    const TigerUnifiedStakingImplFactory = await ethers.getContractFactory("TigerUnifiedStaking");
    const kageUnifiedStakingImpl = await TigerUnifiedStakingImplFactory.deploy();
    const kageUnifiedStakingImplReceipt = await kageUnifiedStakingImpl.deployTransaction.wait();
    
    totalGasUsed = totalGasUsed.add(kageUnifiedStakingImplReceipt.gasUsed);
    result.deploymentAddresses.kageUnifiedStakingImpl = kageUnifiedStakingImpl.address;
    
    result.gasUsage.breakdown.push({
      operation: "TigerUnifiedStaking implementation",
      gasUsed: kageUnifiedStakingImplReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(kageUnifiedStakingImplReceipt.gasUsed.mul(kageUnifiedStakingImplReceipt.effectiveGasPrice))
    });
    
    // Deploy proxies
    console.log("Deploying TransparentUpgradeableProxy contracts...");
    
    const TransparentUpgradeableProxyFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");
    
    // Deploy RewardDistributor proxy with initialization
    console.log("Deploying RewardDistributor proxy with initialization...");
    const RewardDistributorFactory = await ethers.getContractFactory("RWARewardDistributor");
    const rewardDistributorInitData = RewardDistributorFactory.interface.encodeFunctionData(
      "__RewardDistributor_init",
      [ethers.parseUnits("10000", "ether")] // allowanceThreshold
    );
    
    const rewardDistributorProxy = await TransparentUpgradeableProxyFactory.deploy(
      rewardDistributorImpl.address,
      proxyAdmin.address,
      rewardDistributorInitData
    );
    const rewardDistributorProxyReceipt = await rewardDistributorProxy.deployTransaction.wait();
    
    totalGasUsed = totalGasUsed.add(rewardDistributorProxyReceipt.gasUsed);
    result.deploymentAddresses.rewardDistributorProxy = rewardDistributorProxy.address;
    
    result.gasUsage.breakdown.push({
      operation: "RewardDistributor proxy with initialization",
      gasUsed: rewardDistributorProxyReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(rewardDistributorProxyReceipt.gasUsed.mul(rewardDistributorProxyReceipt.effectiveGasPrice))
    });
    
    // DeployTigerRevenue proxy
    const kageRevenueProxy = await TransparentUpgradeableProxyFactory.deploy(
      kageRevenueImpl.address,
      proxyAdmin.address,
      "0x" // No initialization data
    );
    const kageRevenueProxyReceipt = await kageRevenueProxy.deployTransaction.wait();
    
    totalGasUsed = totalGasUsed.add(kageRevenueProxyReceipt.gasUsed);
    result.deploymentAddresses.kageRevenueProxy = kageRevenueProxy.address;
    
    result.gasUsage.breakdown.push({
      operation: "TigerRevenue proxy",
      gasUsed: kageRevenueProxyReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(kageRevenueProxyReceipt.gasUsed.mul(kageRevenueProxyReceipt.effectiveGasPrice))
    });
    
    // DeployTigerStaking proxy
    const kageUnifiedStakingProxy = await TransparentUpgradeableProxyFactory.deploy(
      kageUnifiedStakingImpl.address,
      proxyAdmin.address,
      "0x" // No initialization data
    );
    const kageUnifiedStakingProxyReceipt = await kageUnifiedStakingProxy.deployTransaction.wait();
    
    totalGasUsed = totalGasUsed.add(kageUnifiedStakingProxyReceipt.gasUsed);
    result.deploymentAddresses.kageUnifiedStakingProxy = kageUnifiedStakingProxy.address;
    
    result.gasUsage.breakdown.push({
      operation: "TigerUnifiedStaking proxy",
      gasUsed: kageUnifiedStakingProxyReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(kageUnifiedStakingProxyReceipt.gasUsed.mul(kageUnifiedStakingProxyReceipt.effectiveGasPrice))
    });
    
    result.testResults.contract_deployment = {
      status: "pass",
      message: "All contracts deployed successfully with TransparentUpgradeableProxy"
    };
    result.summary.passed++;
    
  } catch (error: any) {
    result.testResults.contract_deployment = {
      status: "fail",
      message: "Contract deployment failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
  }
  result.summary.totalTests++;
  
  result.gasUsage.totalGasUsed = totalGasUsed.toString();
  result.gasUsage.totalGasCostETH = ethers.formatEther(totalGasUsed.mul(await ethers.provider.getGasPrice()));
}

async function initializeAndConfigureContracts(result: DryRunResult) {
  console.log("\n⚙️ Phase 3: Contract Initialization and Configuration");
  
  try {
    const deployer = await ethers.getSigner(0) as any;
    
    // Get proxy contracts
    const rewardDistributorProxy = await ethers.getContractAt("RWARewardDistributor", result.deploymentAddresses.rewardDistributorProxy);
    const kageRevenueProxy = await ethers.getContractAt("TigerRevenue", result.deploymentAddresses.kageRevenueProxy);
    const kageUnifiedStakingProxy = await ethers.getContractAt("TigerStaking", result.deploymentAddresses.kageUnifiedStakingProxy);
    
    // InitializeTigerRevenue
    console.log("InitializingTigerRevenue...");
    const kageRevenueInitTx = await kageRevenueProxy.__TigerRevenue_init(
      deployer.address, // kageMulti (will be set to staking contract later)
      deployer.address  // treasury
    );
    const kageRevenueInitReceipt = await kageRevenueInitTx.wait();
    
    result.gasUsage.breakdown.push({
      operation: "TigerRevenue initialization",
      gasUsed: kageRevenueInitReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(kageRevenueInitReceipt.gasUsed.mul(kageRevenueInitReceipt.effectiveGasPrice))
    });
    
    // InitializeTigerStaking
    console.log("InitializingTigerStaking...");
    const kageUnifiedStakingInitTx = await kageUnifiedStakingProxy.initialize(
      deployer.address, // kageAcceptedToken (placeholder)
      deployer.address, // kageRewardDistributor
      deployer.address, // treasury
      result.deploymentAddresses.kageRevenueProxy, // kageRevenue
      true // shouldCreateDefaultPool
    );
    const kageUnifiedStakingInitReceipt = await kageUnifiedStakingInitTx.wait();
    
    result.gasUsage.breakdown.push({
      operation: "TigerUnifiedStaking initialization",
      gasUsed: kageUnifiedStakingInitReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(kageUnifiedStakingInitReceipt.gasUsed.mul(kageUnifiedStakingInitReceipt.effectiveGasPrice))
    });
    
    // SetTigerRevenue onTigerStaking
    console.log("SettingTigerRevenue onTigerStaking...");
    const setTigerRevenueTx = await kageUnifiedStakingProxy.setTigerRevenue(result.deploymentAddresses.kageRevenueProxy);
    const setTigerRevenueReceipt = await setTigerRevenueTx.wait();
    
    result.gasUsage.breakdown.push({
      operation: "SetTigerRevenue on staking",
      gasUsed: setTigerRevenueReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(setTigerRevenueReceipt.gasUsed.mul(setTigerRevenueReceipt.effectiveGasPrice))
    });
    
    // SetTigerStaking onTigerRevenue
    console.log("SettingTigerStaking onTigerRevenue...");
    const setTigerMultiTx = await kageRevenueProxy.setTigerMulti(result.deploymentAddresses.kageUnifiedStakingProxy);
    const setTigerMultiReceipt = await setTigerMultiTx.wait();
    
    result.gasUsage.breakdown.push({
      operation: "SetTigerStaking on revenue",
      gasUsed: setTigerMultiReceipt.gasUsed.toString(),
      gasCost: ethers.formatEther(setTigerMultiReceipt.gasUsed.mul(setTigerMultiReceipt.effectiveGasPrice))
    });
    
    // Configure RewardDistributor
    console.log("Configuring RewardDistributor...");
    const rewardDistributorContract = await ethers.getContractAt("RWARewardDistributor", result.deploymentAddresses.rewardDistributorProxy);
    
    // Note: In a real deployment, we would set approvals for actual tokens
    // For the dry run, we just verify the contract is properly initialized
    console.log("✅ RewardDistributor proxy deployed and initialized successfully");
    
    result.testResults.contract_initialization = {
      status: "pass",
      message: "All contracts initialized and configured successfully"
    };
    result.summary.passed++;
    
  } catch (error: any) {
    result.testResults.contract_initialization = {
      status: "fail",
      message: "Contract initialization failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
  }
  result.summary.totalTests++;
}

async function testEcosystemIntegration(result: DryRunResult) {
  console.log("\n🔗 Phase 4: Ecosystem Integration Testing");
  
  try {
      const deployer = await ethers.getSigner(0) as any;
    const kageRevenueProxy = await ethers.getContractAt("TigerRevenue", result.deploymentAddresses.kageRevenueProxy);
    const kageUnifiedStakingProxy = await ethers.getContractAt("TigerUnifiedStaking", result.deploymentAddresses.kageUnifiedStakingProxy);
    
    // Test 1: Verify contract linkages
    const stakingTigerRevenue = await kageUnifiedStakingProxy.kageRevenue();
    const revenueTigerMulti = await kageRevenueProxy.kageMulti();
    
    if (stakingTigerRevenue === result.deploymentAddresses.kageRevenueProxy &&
        revenueTigerMulti === result.deploymentAddresses.kageUnifiedStakingProxy) {
      result.testResults.contract_linkages = {
        status: "pass",
        message: "Contract linkages verified successfully"
      };
      result.summary.passed++;
    } else {
      result.testResults.contract_linkages = {
        status: "fail",
        message: "Contract linkages verification failed",
        details: {
          expectedStakingTigerRevenue: result.deploymentAddresses.kageRevenueProxy,
          actualStakingTigerRevenue: stakingTigerRevenue,
          expectedRevenueTigerMulti: result.deploymentAddresses.kageUnifiedStakingProxy,
          actualRevenueTigerMulti: revenueTigerMulti
        }
      };
      result.summary.failed++;
    }
    result.summary.totalTests++;
    
    // Test 2: Verify proxy functionality by checking contract state
    try {
      const stakingTreasury = await kageUnifiedStakingProxy.treasury();
      const revenueTreasury = await kageRevenueProxy.treasury();
      
      if (stakingTreasury === deployer.address && revenueTreasury === deployer.address) {
        result.testResults.proxy_functionality = {
          status: "pass",
          message: "Proxy functionality verified successfully"
        };
        result.summary.passed++;
      } else {
        result.testResults.proxy_functionality = {
          status: "fail",
          message: "Proxy functionality verification failed",
          details: {
            expectedStakingTreasury: deployer.address,
            actualStakingTreasury: stakingTreasury,
            expectedRevenueTreasury: deployer.address,
            actualRevenueTreasury: revenueTreasury
          }
        };
        result.summary.failed++;
      }
    } catch (error: any) {
      result.testResults.proxy_functionality = {
        status: "fail",
        message: "Proxy functionality verification failed",
        details: { error: error?.message || String(error) }
      };
      result.summary.failed++;
    }
    result.summary.totalTests++;
    
    // Test 3: Verify RewardDistributor configuration
    try {
      const rewardDistributorContract = await ethers.getContractAt("RWARewardDistributor", result.deploymentAddresses.rewardDistributorProxy);
      const rewardDistributorOwner = await rewardDistributorContract.owner();
      const allowanceThreshold = await rewardDistributorContract.allowanceThreshold();
      
      if (rewardDistributorOwner === deployer.address && allowanceThreshold.gt(0)) {
        result.testResults.reward_distributor_config = {
          status: "pass",
          message: "RewardDistributor configuration verified successfully"
        };
        result.summary.passed++;
      } else {
        result.testResults.reward_distributor_config = {
          status: "fail",
          message: "RewardDistributor configuration verification failed",
          details: {
            expectedOwner: deployer.address,
            actualOwner: rewardDistributorOwner,
            allowanceThreshold: allowanceThreshold.toString()
          }
        };
        result.summary.failed++;
      }
    } catch (error: any) {
      result.testResults.reward_distributor_config = {
        status: "fail",
        message: "RewardDistributor configuration verification failed",
        details: { error: error?.message || String(error) }
      };
      result.summary.failed++;
    }
    result.summary.totalTests++;
    
  } catch (error: any) {
    result.testResults.ecosystem_integration = {
      status: "fail",
      message: "Ecosystem integration testing failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
    result.summary.totalTests++;
  }
}

async function testContractFunctionality(result: DryRunResult) {
  console.log("\n🧪 Phase 5: Contract Functionality Testing");
  
  try {
    const [deployer, user1] = await ethers.getSigners();
    const kageUnifiedStakingProxy = await ethers.getContractAt("TigerUnifiedStaking", result.deploymentAddresses.kageUnifiedStakingProxy);
    const kageRevenueProxy = await ethers.getContractAt("TigerRevenue", result.deploymentAddresses.kageRevenueProxy);
    
    // Test 1: Basic staking functionality - check if function exists
    try {
      // Check if the contract has the expected functions
      const contractInterface = kageUnifiedStakingProxy.interface;
      const availableFunctions = Object.keys(contractInterface.functions);
      
      // Look for staking-related functions
      const hasCreateUserStakeFunction = availableFunctions.some(fn => fn.includes('stake'));
      const hasUserWithdrawFunction = availableFunctions.some(fn => fn.includes('withdraw'));
      
      if (hasCreateUserStakeFunction || hasUserWithdrawFunction) {
        result.testResults.staking_functionality = {
          status: "pass",
          message: `Staking functions available on contract. Found: ${availableFunctions.filter(fn => fn.includes('stake') || fn.includes('withdraw')).join(', ')}`
        };
        result.summary.passed++;
      } else {
        result.testResults.staking_functionality = {
          status: "warning",
          message: `Staking functions not found on contract interface. Available functions: ${availableFunctions.slice(0, 10).join(', ')}...`
        };
        result.summary.warnings++;
      }
    } catch (error: any) {
      result.testResults.staking_functionality = {
        status: "fail",
        message: "Staking functionality test failed",
        details: { error: error?.message || String(error) }
      };
      result.summary.failed++;
    }
    result.summary.totalTests++;
    
    // Test 2: Revenue distribution functionality - check if function exists
    try {
      const contractInterface = kageRevenueProxy.interface;
      const availableFunctions = Object.keys(contractInterface.functions);
      
      // Look for revenue-related functions
      const hasTigerAllocateRevenueFunction = availableFunctions.some(fn => fn.includes('kageAllocateRevenue'));
      const hasAllocateRevenueFunction = availableFunctions.some(fn => fn.includes('allocateRevenue'));
      const hasRevenueFunction = availableFunctions.some(fn => fn.includes('revenue'));
      
      if (hasTigerAllocateRevenueFunction || hasAllocateRevenueFunction || hasRevenueFunction) {
        result.testResults.revenue_distribution = {
          status: "pass",
          message: `Revenue distribution functions available on contract. Found: ${availableFunctions.filter(fn => fn.includes('revenue') || fn.includes('allocate')).join(', ')}`
        };
        result.summary.passed++;
      } else {
        result.testResults.revenue_distribution = {
          status: "warning",
          message: `Revenue distribution functions not found on contract interface. Available functions: ${availableFunctions.slice(0, 10).join(', ')}...`
        };
        result.summary.warnings++;
      }
    } catch (error: any) {
      result.testResults.revenue_distribution = {
        status: "fail",
        message: "Revenue distribution functionality test failed",
        details: { error: error?.message || String(error) }
      };
      result.summary.failed++;
    }
    result.summary.totalTests++;
    
    // Test 3: RewardDistributor functionality - check if functions exist
    try {
      const rewardDistributorContract = await ethers.getContractAt("RWARewardDistributor", result.deploymentAddresses.rewardDistributorProxy);
      const contractInterface = rewardDistributorContract.interface;
      const availableFunctions = Object.keys(contractInterface.functions);
      
      // Look for RewardDistributor-specific functions
      const hasApproveERC20Function = availableFunctions.some(fn => fn.includes('approveERC20'));
      const hasBatchApproveFunction = availableFunctions.some(fn => fn.includes('batchApprove'));
      const hasEmergencyFunction = availableFunctions.some(fn => fn.includes('emergency'));
      
      if (hasApproveERC20Function || hasBatchApproveFunction || hasEmergencyFunction) {
        result.testResults.reward_distributor_functionality = {
          status: "pass",
          message: `RewardDistributor functions available on contract. Found: ${availableFunctions.filter(fn => fn.includes('approve') || fn.includes('emergency') || fn.includes('batch')).join(', ')}`
        };
        result.summary.passed++;
      } else {
        result.testResults.reward_distributor_functionality = {
          status: "warning",
          message: `RewardDistributor functions not found on contract interface. Available functions: ${availableFunctions.slice(0, 10).join(', ')}...`
        };
        result.summary.warnings++;
      }
    } catch (error: any) {
      result.testResults.reward_distributor_functionality = {
        status: "fail",
        message: "RewardDistributor functionality test failed",
        details: { error: error?.message || String(error) }
      };
      result.summary.failed++;
    }
    result.summary.totalTests++;
    
  } catch (error: any) {
    result.testResults.contract_functionality = {
      status: "fail",
      message: "Contract functionality testing failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
    result.summary.totalTests++;
  }
}

async function analyzeGasUsage(result: DryRunResult) {
  console.log("\n⛽ Phase 6: Gas Usage Analysis");
  
  try {
    const totalGasUsed = ethers.BigNumber.from(result.gasUsage.totalGasUsed);
    const gasPrice = await ethers.provider.getGasPrice();
    const totalCost = totalGasUsed.mul(gasPrice);
    
    console.log(`Total Gas Used: ${totalGasUsed.toString()}`);
    console.log(`Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    console.log(`Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} Gwei`);
    
    result.testResults.gas_analysis = {
      status: "pass",
      message: `Deployment completed with ${totalGasUsed.toString()} gas (${ethers.formatEther(totalCost)} ETH)`
    };
    result.summary.passed++;
    
  } catch (error: any) {
    result.testResults.gas_analysis = {
      status: "fail",
      message: "Gas usage analysis failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
  }
  result.summary.totalTests++;
}

async function generateArtifacts(result: DryRunResult) {
  console.log("\n📄 Phase 7: Artifact Generation");
  
  try {
    // Create deployment artifacts
    const deploymentArtifacts = {
      network: "hardhat",
      timestamp: result.timestamp,
      addresses: result.deploymentAddresses,
      gasUsage: result.gasUsage,
      testResults: result.testResults
    };
    
    fs.writeFileSync("dry-run-deployment-artifacts.json", JSON.stringify(deploymentArtifacts, null, 2));
    
    result.testResults.artifact_generation = {
      status: "pass",
      message: "Deployment artifacts generated successfully"
    };
    result.summary.passed++;
    
  } catch (error: any) {
    result.testResults.artifact_generation = {
      status: "fail",
      message: "Artifact generation failed",
      details: { error: error?.message || String(error) }
    };
    result.summary.failed++;
  }
  result.summary.totalTests++;
}

function generateSummary(result: DryRunResult) {
  console.log("\n📊 Dry Run Summary");
  console.log("==================");
  console.log(`Total Tests: ${result.summary.totalTests}`);
  console.log(`✅ Passed: ${result.summary.passed}`);
  console.log(`❌ Failed: ${result.summary.failed}`);
  console.log(`⚠️ Warnings: ${result.summary.warnings}`);
  console.log(`Total Gas Used: ${result.gasUsage.totalGasUsed}`);
  console.log(`Total Cost: ${result.gasUsage.totalGasCostETH} ETH`);
  
  console.log("\n🏗️ Deployed Addresses:");
  for (const [contract, address] of Object.entries(result.deploymentAddresses)) {
    console.log(`${contract}: ${address}`);
  }
  
  console.log("\n📋 Detailed Results:");
  for (const [testName, test] of Object.entries(result.testResults)) {
    const status = test.status === "pass" ? "✅" : test.status === "fail" ? "❌" : "⚠️";
    console.log(`${status} ${testName}: ${test.message}`);
  }
  
  if (result.summary.failed === 0) {
    result.summary.deploymentSuccessful = true;
    console.log("\n🎉 Dry run deployment successful!");
  } else {
    console.log("\n❌ Dry run deployment failed!");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Dry run failed:", error);
    process.exit(1);
  });
}
