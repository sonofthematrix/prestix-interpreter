# Local Node Environment - Dry Run Files

## 📁 Purpose
This directory contains hardhat dry-run files and artifacts for local development and regression testing.

## 📋 Contents

### Scripts
- `dry-run-hardhat-node.ts` - Comprehensive hardhat node end-to-end dry run script
  - Performs full deployment pipeline simulation
  - Tests contract deployment with TransparentUpgradeableProxy
  - Validates contract interactions and functionality
  - Generates deployment artifacts and gas usage analysis

### Artifacts
- `dry-run-hardhat-node-results.json` - Test results from hardhat node dry run
- `dry-run-deployment-artifacts.json` - Deployment artifacts and gas usage breakdown

## 🚀 Usage

### Running the Local Node Dry Run
```bash
# From project root
bun run  test:dry-run:local
```

### Manual Execution
```bash
# From project root
npx ts-node "local node/dry-run-hardhat-node.ts"
```

## 📊 Test Results Summary
- **Last Run**: August 25, 2025
- **Network**: Hardhat (chainId: 31337)
- **Status**: All tests passed
- **Total Gas Used**: 12,998,482
- **Total Cost**: ~0.021 ETH

## 🔧 Configuration
- Uses local Hardhat node for testing
- Simulates full deployment pipeline
- Validates contract linkages and functionality
- Generates comprehensive test reports

## 📝 Notes
- These files are preserved for regression testing
- Useful for validating deployment changes
- Can be used to test contract upgrades
- Maintains historical deployment data for comparison
