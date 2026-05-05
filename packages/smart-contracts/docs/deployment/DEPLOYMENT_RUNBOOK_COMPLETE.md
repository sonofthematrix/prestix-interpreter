# 🚀 KAGE Staking Ecosystem - Complete Deployment Runbook

## 📋 **DEPLOYMENT OVERVIEW**

This runbook provides step-by-step instructions for deploying the KAGE Staking Ecosystem to production, incorporating all optimizations, security validations, and best practices discovered during development.

### **Key Optimizations Integrated:**
- 🎯 **Optimizer Sweet Spot**: `runs: 1` for implementation contracts
- 🔒 **Security Enhancement**: TransparentUpgradeableProxy implementation
- 📊 **Network Analysis**: Real-time gas monitoring and optimization
- 🔄 **Resumable Deployment**: State persistence and step-by-step control

## 🎯 **PRE-DEPLOYMENT CHECKLIST**

### **Environment Setup**
- [ ] **Node.js**: v22.14.0 installed and active
- [ ] **Hardhat**: Latest version with all plugins
- [ ] **Environment Variables**: All API keys configured
- [ ] **Deployer Balance**: Sufficient funds for deployment + 20% buffer
- [ ] **Network Access**: Infura/API endpoints accessible

### **Configuration Validation**
- [ ] **Optimized Config**: `hardhat.config.optimized.ts` ready
- [ ] **Deployment Scripts**: Enhanced scripts tested
- [ ] **Contract Compilation**: All contracts compile successfully
- [ ] **Test Suite**: 261 tests passing
- [ ] **Gas Reports**: Generated and reviewed

### **Security Validation**
- [ ] **ProxyAdmin Ownership**: Verified against expected address
- [ ] **Access Controls**: All permissions validated
- [ ] **Emergency Functions**: Circuit breaker tested
- [ ] **Fee Exclusions**: RewardDistributor properly configured
- [ ] **Allowance Management**: ERC20 approval chains validated

## 🔧 **DEPLOYMENT CONFIGURATIONS**

### **Optimized Configuration File**
**File**: `hardhat.config.optimized.ts`

```typescript
solidity: {
  compilers: [
    {
      version: "0.8.27",
      settings: {
        optimizer: {
          enabled: true,
          runs: 1, // 🎯 SWEET SPOT: Optimal for deployment cost
          details: {
            yul: true,
            deduplicate: true,
            cse: true,
            constantOptimizer: true,
          },
        },
      },
    },
  ],
  overrides: {
    // Proxy contracts: optimize for runtime performance
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol": {
      optimizer: { enabled: true, runs: 999999 },
    },
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol": {
      optimizer: { enabled: true, runs: 999999 },
    },
    // Implementation contracts: optimize for deployment cost
    "contracts/TigerStaking.sol": {
      optimizer: { enabled: true, runs: 1 },
    },
    "contracts/TigerRevenue.sol": {
      optimizer: { enabled: true, runs: 1 },
    },
    "contracts/RewardDistributor.sol": {
      optimizer: { enabled: true, runs: 1 },
    },
  },
}
```

### **Expected Performance Metrics**
- **Total Contract Size**: 47.06 KiB (optimized)
- **Deployment Cost**: ~10.2M gas
- **Mainnet Savings**: ~$25-50 vs standard configuration
- **Runtime Gas**: ~100k gas per typical operation

## 📊 **DEPLOYMENT PHASES**

### **Phase 1: Pre-Deployment Analysis**

#### **Step 1: Network Analysis**
```bash
# Run enhanced deployment script for network analysis
npx hardhat run scripts/deploy-ecosystem-with-proxies-enhanced.ts \
  --config hardhat.config.optimized.ts \
  --network sepolia
```

**Expected Output:**
```
🔍 Analyzing Network Conditions...
📊 Network Analysis Results:
├── Current Gas Price: 2.5 Gwei ($0.005)
├── Network Congestion: LOW
├── Deployer Balance: 1.5 ETH ($3,000)
├── Estimated Deployment Cost: 0.025 ETH ($50)
├── Sufficient Balance: ✅ Yes
└── Recommended Action: PROCEED
```

#### **Step 2: Configuration Validation**
```bash
# Compile with optimized settings
npx hardhat compile --config hardhat.config.optimized.ts

# Verify contract sizes
npx hardhat size-contracts --config hardhat.config.optimized.ts
```

**Expected Output:**
```
Contract Name         │ Deployed size (KiB) │ Initcode size (KiB)
TigerRevenue           │ 16.623              │ 16.858
TigerStaking    │ 22.117              │ 22.347
RewardDistributor     │ 8.316               │ 8.541
```

#### **Step 3: Final Pre-Deployment Tests**
```bash
# Run full test suite
bun run  test

# Generate gas report
REPORT_GAS=true bun run  test
```

### **Phase 2: Testnet Deployment (Sepolia)**

#### **Step 1: Deploy with Enhanced Monitoring**
```bash
# Deploy to Sepolia with full monitoring
npx hardhat run scripts/deploy-ecosystem-with-proxies-enhanced.ts \
  --config hardhat.config.optimized.ts \
  --network sepolia
```

**Deployment Steps:**
1. **Network Analysis**: Gas price and congestion check
2. **Balance Validation**: Deployer account funding check
3. **Implementation Deployment**: Deploy implementation contracts
4. **Proxy Deployment**: Deploy TransparentUpgradeableProxy contracts
5. **Initialization**: Initialize all contracts
6. **Configuration**: Set up pools, tiers, and permissions
7. **Funding**: Fund RewardDistributor
8. **Approvals**: Set up ERC20 allowances
9. **Verification**: Verify all contracts on Etherscan
10. **Validation**: Final configuration validation

#### **Step 2: Post-Deployment Validation**
```bash
# Verify contract addresses
cat deployed-addresses-proxy.json

# Test core functionality
npx hardhat run scripts/test-core-functionality.ts --network sepolia
```

**Expected Sepolia Addresses:**
```json
{
  "network": "sepolia",
  "addresses": {
    "TigerStaking_Proxy": "0x...",
    "TigerRevenue_Proxy": "0x...",
    "RewardDistributor_Proxy": "0x...",
    "TigerStaking_Implementation": "0x...",
    "TigerRevenue_Implementation": "0x...",
    "RewardDistributor_Implementation": "0x..."
  }
}
```

### **Phase 3: Production Deployment (Mainnet)**

#### **Step 1: Pre-Production Validation**
```bash
# Final compilation check
npx hardhat compile --config hardhat.config.optimized.ts

# Gas estimation for mainnet
npx hardhat run scripts/estimate-mainnet-gas.ts --config hardhat.config.optimized.ts
```

#### **Step 2: Mainnet Deployment**
```bash
# Deploy to mainnet with enhanced monitoring
npx hardhat run scripts/deploy-ecosystem-with-proxies-enhanced.ts \
  --config hardhat.config.optimized.ts \
  --network mainnet
```

**Critical Mainnet Considerations:**
- **Gas Price**: Monitor and wait for optimal conditions (15-30 gwei)
- **Balance**: Ensure deployer has sufficient ETH (0.5+ ETH recommended)
- **Timing**: Deploy during low congestion periods
- **Verification**: All contracts must be verified on Etherscan

## 🔍 **DEPLOYMENT MONITORING**

### **Real-Time Monitoring**
The enhanced deployment script provides:

```
📊 Gas Analysis for: TigerStaking Implementation Deployment
├── Gas Used: 2,247,123 / 5,000,000
├── Gas Price: 25.5 Gwei
├── Gas Cost: 0.057 ETH ($114.00)
├── Block: 18,456,789
├── Confirmations: 12
└── Duration: 2,340ms
```

### **Step-by-Step Control**
```
⏸️  Deployment paused at step: kageRevenueInit
📋 Reason: Network analysis completed
📊 Current Status:
├── Step: kageRevenueInit
├── Time: 2025-01-25T12:34:56.789Z
└── Ready to continue

✅ Press Enter to continue deployment, or type 'exit' to stop:
```

### **State Persistence**
- **Deployment State**: Saved to `deployment-state-enhanced.json`
- **Resumable**: Can continue from any step if interrupted
- **Gas Tracking**: Complete gas usage breakdown
- **Address Tracking**: All deployed addresses saved

## 🚨 **TROUBLESHOOTING**

### **Common Issues and Solutions**

#### **Issue 1: Contract Size Limit Exceeded**
**Error**: `Contract code size is 24876 bytes and exceeds 24576 bytes`

**Solution**: 
- ✅ Already resolved with `runs: 1` optimization
- Verify using optimized configuration

#### **Issue 2: Insufficient Gas**
**Error**: `out of gas` or `gas limit exceeded`

**Solution**:
- Increase gas limit in deployment script
- Check network congestion and wait for better conditions
- Use enhanced script for automatic gas estimation

#### **Issue 3: Verification Failures**
**Error**: `Already Verified` or verification timeout

**Solution**:
- Wait 30-60 seconds between deployments
- Check Etherscan API rate limits
- Use enhanced script with built-in delays

#### **Issue 4: Proxy Initialization Failures**
**Error**: `Initializable: contract is already initialized`

**Solution**:
- Check if contracts already deployed
- Use resumable deployment to skip completed steps
- Verify proxy addresses in state file

### **Emergency Procedures**

#### **Deployment Failure Recovery**
```bash
# Check deployment state
cat deployment-state-enhanced.json

# Resume from last successful step
npx hardhat run scripts/deploy-ecosystem-with-proxies-enhanced.ts \
  --config hardhat.config.optimized.ts \
  --network mainnet
```

#### **Rollback Strategy**
1. **Pause Deployment**: Stop at any step if issues detected
2. **Analyze State**: Review deployment state file
3. **Fix Issues**: Address any configuration problems
4. **Resume**: Continue from last successful step
5. **Validate**: Run post-deployment validation

## 📊 **POST-DEPLOYMENT VALIDATION**

### **Immediate Validation (0-1 hour)**
- [ ] **Contract Verification**: All contracts verified on Etherscan
- [ ] **Address Validation**: All addresses saved and documented
- [ ] **Basic Functionality**: Core staking operations tested
- [ ] **Gas Usage**: Runtime gas costs within expected ranges
- [ ] **Security Checks**: Access controls and emergency functions tested

### **Comprehensive Validation (1-24 hours)**
- [ ] **Integration Tests**: Cross-contract communication verified
- [ ] **Edge Cases**: Comprehensive error handling tested
- [ ] **Performance Tests**: Gas usage under various conditions
- [ ] **Security Audit**: Post-deployment security assessment
- [ ] **Documentation**: Final deployment documentation completed

### **Validation Commands**
```bash
# Verify all contracts
npx hardhat run scripts/verify-all-contracts.ts --network mainnet

# Test core functionality
npx hardhat run scripts/test-production-functionality.ts --network mainnet

# Generate final gas report
REPORT_GAS=true npx hardhat test --network mainnet
```

## 📋 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment (24 hours)**
- [ ] **Environment**: All tools and configurations ready
- [ ] **Balance**: Deployer account sufficiently funded
- [ ] **Network**: Gas prices and congestion monitored
- [ ] **Backup**: Rollback strategy prepared
- [ ] **Team**: Deployment team briefed and ready

### **Deployment Day**
- [ ] **Network Conditions**: Optimal deployment window identified
- [ ] **Script Execution**: Enhanced deployment script run
- [ ] **Step Validation**: Each step confirmed before proceeding
- [ ] **Transaction Monitoring**: All transactions tracked
- [ ] **Verification**: Contracts verified on Etherscan

### **Post-Deployment (24-48 hours)**
- [ ] **Functionality**: All core operations validated
- [ ] **Integration**: Cross-contract communication verified
- [ ] **Security**: Access controls and emergency functions tested
- [ ] **Performance**: Gas usage and performance monitored
- [ ] **Documentation**: Final deployment documentation completed

## 🎯 **SUCCESS METRICS**

### **Technical Success Criteria**
- ✅ **All contracts deployed** and verified on target network
- ✅ **Optimizer runs: 1** configuration successfully applied
- ✅ **Contract sizes** within mainnet limits (under 24KB)
- ✅ **Gas costs** within projected budgets
- ✅ **All functionality** working as expected

### **Operational Success Criteria**
- ✅ **Deployment completed** within planned timeframe
- ✅ **No critical issues** discovered post-deployment
- ✅ **Performance metrics** meeting expectations
- ✅ **Security validations** all passed
- ✅ **Documentation** complete and accurate

## 🎉 **CONCLUSION**

This runbook provides a comprehensive deployment strategy incorporating:

- 🎯 **Optimizer Sweet Spot**: `runs: 1` for optimal performance
- 🔒 **Security Enhancement**: TransparentUpgradeableProxy implementation
- 📊 **Network Analysis**: Real-time monitoring and optimization
- 🔄 **Resumable Deployment**: State persistence and control
- 🚨 **Risk Mitigation**: Comprehensive troubleshooting and recovery

**The KAGE Staking Ecosystem is ready for production deployment with confidence!** 🚀

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-25  
**Next Review**: Post-deployment validation
