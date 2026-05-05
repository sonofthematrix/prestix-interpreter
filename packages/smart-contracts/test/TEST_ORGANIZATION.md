# Smart Contract Test Organization

## Overview

This document organizes all test files in the RWA Marketplace ecosystem by category, maps tests to contracts they cover, and identifies test dependencies and execution order.

## Test Categories

### 1. Unit Tests
Single contract functionality tests with isolated logic validation.

#### Marketplace Tests
- **marketplace-token-custody.spec.ts** (475 lines)
  - Contract: `RWAMarketplace.sol`
  - Focus: Token custody architecture, marketplace holds tokens and transfers to buyers
  - Dependencies: `RWAAssetRegistry.sol`, `RWATokenFactory404Fixed.sol`

- **usdc-integration.spec.ts** (227 lines)
  - Contract: `RWAMarketplace.sol`
  - Focus: Stablecoin payment integration (USDC)
  - Dependencies: USDC mock contracts, marketplace infrastructure

#### Token Factory Tests
- **rwa-token-factory-404.spec.ts** (285 lines)
  - Contract: `RWATokenFactory404.sol`
  - Focus: ERC404 token creation and deployment
  - Dependencies: None (isolated factory testing)

- **rwa-token-factory-404-fixed.spec.ts** (?? lines)
  - Contract: `RWATokenFactory404Fixed.sol`
  - Focus: Fixed version of ERC404 factory with wei conversion fixes
  - Dependencies: None (isolated factory testing)

#### Security Tests
- **security-audit-fixes.spec.ts** (577 lines)
  - Contracts: Multiple (RWAAssetRegistry, RWAMarketplace, RWAToken404, RWAStaking, etc.)
  - Focus: Security audit fixes validation across all contracts
  - Dependencies: Full ecosystem deployment

### 2. Integration Tests
Multiple contract interactions and cross-contract workflows.

#### Directory: `integration/`
- **end-to-end-security-fixes.spec.ts** (427 lines)
  - Contracts: Full ecosystem (TigerPalaceToken, Staking, Revenue, RewardDistributor)
  - Focus: End-to-end user journeys with security fixes applied
  - Dependencies: Full upgradeable ecosystem deployment

- **dividend-staking-integration.spec.ts** (?? lines)
  - Contracts: RWAStaking, RWARevenue, RWARewardDistributor
  - Focus: Dividend distribution and staking integration
  - Dependencies: Staking ecosystem deployment

#### Ecosystem Tests
- **ecosystem-integration.spec.ts** (?? lines)
  - Contracts: Full RWA ecosystem
  - Focus: Cross-contract integration and data consistency
  - Dependencies: Complete ecosystem deployment

- **ecosystem-performance.spec.ts** (?? lines)
  - Contracts: Full ecosystem
  - Focus: Performance testing and gas optimization
  - Dependencies: Complete ecosystem deployment

### 3. End-to-End Tests
Complete user workflows from start to finish.

#### Directory: `e2e/`
- **tiger-palace-marketplace-comprehensive.spec.ts** (1179 lines)
  - Contracts: Full marketplace ecosystem
  - Focus: Complete marketplace flow (registration → token creation → listing → purchase)
  - Dependencies: Full marketplace infrastructure

- **rwa-marketplace-token-lifecycle.spec.ts** (765 lines)
  - Contracts: Marketplace ecosystem
  - Focus: Token lifecycle from creation to trading
  - Dependencies: Marketplace infrastructure

### 4. Staking Tests
Staking and reward distribution functionality.

#### Staking Core
- **rwa-staking-integration.spec.ts** (?? lines)
  - Contract: `RWAStaking.sol`
  - Focus: Staking integration and reward distribution
  - Dependencies: Reward system contracts

#### Revenue Tests
- **tiger-revenue-enhanced-coverage.spec.ts** (?? lines)
  - Contract: `RWARevenue.sol`
  - Focus: Revenue distribution and claiming
  - Dependencies: Staking contracts

- **tiger-revenue-error-emergency-tests.spec.ts** (?? lines)
  - Contract: `RWARevenue.sol`
  - Focus: Error handling and emergency scenarios
  - Dependencies: Revenue system

#### Reward Distribution
- **reward-distributor-contract.spec.ts** (?? lines)
  - Contract: `RWARewardDistributor.sol`
  - Focus: Reward distribution logic
  - Dependencies: Token contracts

- **reward-distributor-error-emergency-tests.spec.ts** (?? lines)
  - Contract: `RWARewardDistributor.sol`
  - Focus: Error handling in reward distribution
  - Dependencies: Reward system

#### Enhanced Staking
- **tiger-unified-staking-enhanced.spec.ts** (?? lines)
  - Contract: `RWAStaking.sol`
  - Focus: Enhanced staking features and edge cases
  - Dependencies: Full staking ecosystem

- **tiger-staking-refactored.spec.ts** (?? lines)
  - Contract: `RWAStaking.sol`
  - Focus: Refactored staking logic and optimizations
  - Dependencies: Staking infrastructure

#### Staking Error Handling
- **tiger-staking-error-emergency-tests.spec.ts** (?? lines)
  - Contract: `RWAStaking.sol`
  - Focus: Error scenarios and emergency handling
  - Dependencies: Staking system

- **simple-staking-test.spec.ts** (?? lines)
  - Contract: `RWAStaking.sol`
  - Focus: Basic staking functionality
  - Dependencies: Minimal staking setup

- **minimal-staking-test.spec.ts** (?? lines)
  - Contract: `RWAStaking.sol`
  - Focus: Minimal staking test cases
  - Dependencies: Basic staking infrastructure

### 5. Revenue and Distribution Tests
Revenue allocation and distribution logic.

- **advanced-revenue-allocation.spec.ts** (?? lines)
  - Contract: Revenue distribution system
  - Focus: Advanced revenue allocation algorithms
  - Dependencies: Revenue contracts

- **enhanced-revenue-allocation.spec.ts** (?? lines)
  - Contract: Revenue distribution system
  - Focus: Enhanced allocation features
  - Dependencies: Revenue system

- **comprehensive-revenue-tier-testing.spec.ts** (?? lines)
  - Contract: Revenue distribution system
  - Focus: Revenue tier testing and validation
  - Dependencies: Revenue contracts

- **revenue-distribution-tier-testing.spec.ts** (?? lines)
  - Contract: Revenue distribution system
  - Focus: Distribution tier logic
  - Dependencies: Revenue system

### 6. Error and Emergency Tests
Error handling and emergency scenarios.

- **simple-error-emergency-tests.spec.ts** (?? lines)
  - Contracts: Various
  - Focus: Basic error handling scenarios
  - Dependencies: Contract infrastructure

### 7. Upgradeable Pattern Tests
Upgradeable contract testing patterns.

- **upgradeable-pattern-example.spec.ts** (?? lines)
  - Focus: Upgradeable contract deployment and testing patterns
  - Dependencies: Proxy contracts, implementation contracts

- **tpt-upgradeable-comprehensive.spec.ts** (?? lines)
  - Contract: `TigerPalaceToken.sol` (upgradeable)
  - Focus: Comprehensive upgradeable token testing
  - Dependencies: Upgradeable infrastructure

### 8. Production Scenario Tests
Real-world usage simulations.

- **realistic-production-scenarios.spec.ts** (?? lines)
  - Contracts: Full ecosystem
  - Focus: Production-like usage scenarios
  - Dependencies: Complete ecosystem

- **core-contracts-focused.spec.ts** (?? lines)
  - Contracts: Core infrastructure contracts
  - Focus: Core contract functionality in production context
  - Dependencies: Core contract infrastructure

### 9. Proxy and Infrastructure Tests
Proxy patterns and infrastructure testing.

- **proxy-staking-example.spec.ts** (?? lines)
  - Focus: Proxy pattern usage with staking contracts
  - Dependencies: Proxy contracts, staking contracts

## Contract Coverage Map

### Fully Tested Contracts ✅
- `RWAMarketplace.sol` - Multiple comprehensive tests
- `RWATokenFactory404.sol` - Factory-specific tests
- `RWATokenFactory404Fixed.sol` - Factory-specific tests
- `RWAStaking.sol` - Multiple staking-focused tests
- `RWARevenue.sol` - Revenue-focused tests
- `RWARewardDistributor.sol` - Distribution-focused tests
- `TigerPalaceToken.sol` - Upgradeable token tests

### Partially Tested Contracts ⚠️
- `RWAAssetRegistry.sol` - Tested as part of marketplace flows, but no dedicated tests
- `RWAMarketplaceUpgradeableSetter.sol` - No dedicated tests
- `MembershipSystem.sol` - No tests
- `TokenExchange.sol` - No tests
- `ChainlinkPriceOracle.sol` - No tests

### Untested Contracts ❌
- `RedKiteWhitelist.sol` - No tests
- All proxy contracts - No dedicated tests
- All library contracts - No dedicated tests
- USDC integration contracts - No dedicated tests

## Test Dependencies

### Low-Level Dependencies (Can Run First)
- Unit tests with mock contracts
- Isolated contract tests
- Library function tests

### Medium Dependencies (Run After Low-Level)
- Integration tests requiring 2-3 contracts
- Cross-contract interaction tests
- Factory + token creation tests

### High Dependencies (Run Last)
- Full ecosystem tests
- E2E workflow tests
- Performance tests
- Production scenario tests

## Execution Order Recommendations

### Phase 1: Unit Tests (Parallel Execution)
```bash
# Fast, isolated tests
npm run test:unit
```

### Phase 2: Integration Tests (Sequential Execution)
```bash
# Contract interaction tests
npm run test:integration
```

### Phase 3: E2E Tests (Sequential Execution)
```bash
# Full workflow tests
npm run test:e2e
```

### Phase 4: Security Tests (Sequential Execution)
```bash
# Security validation
npm run test:security
```

### Phase 5: Performance Tests (Parallel Execution)
```bash
# Gas and performance validation
npm run test:performance
```

## Missing Test Coverage

### Critical Gaps
1. **RWAAssetRegistry.sol** - Asset registration, updates, access control
2. **RWAMarketplaceUpgradeableSetter.sol** - Upgradeable marketplace functionality
3. **MembershipSystem.sol** - Membership tier logic, benefits
4. **TokenExchange.sol** - Token swap functionality, liquidity
5. **Proxy Contracts** - Upgrade patterns, admin functionality
6. **Library Contracts** - Utility function validation

### Recommended New Tests
- `rwa-asset-registry.spec.ts` - Comprehensive asset registry testing
- `marketplace-upgradeable.spec.ts` - Upgradeable marketplace patterns
- `membership-system.spec.ts` - Membership functionality
- `token-exchange.spec.ts` - Token exchange mechanics
- `proxy-patterns.spec.ts` - Proxy deployment and upgrades

## Test Infrastructure

### Shared Utilities
- `utils/upgradeable-fixture.ts` - Upgradeable contract deployment
- `utils/token-deployment.ts` - Token deployment utilities
- `utils/gas-helpers.ts` - Gas measurement utilities
- `utils/gas-reporter.ts` - Gas reporting utilities
- `utils/optimized-contract-fixture.ts` - Optimized contract setup

### Test Patterns
- **Fixture Pattern**: Reusable test setup and teardown
- **Upgradeable Pattern**: Production-grade deployment testing
- **Gas Reporting**: Performance monitoring and optimization
- **Security Validation**: Audit fix verification

## Maintenance Notes

### When Adding New Tests
1. Categorize the test appropriately (unit/integration/e2e)
2. Update this document with new test file information
3. Map the test to specific contracts it covers
4. Identify any new dependencies
5. Update execution order if needed

### When Adding New Contracts
1. Identify the contract category and functionality
2. Determine appropriate test type (unit/integration/e2e)
3. Create comprehensive test coverage
4. Update this documentation
5. Add to CI/CD test execution

## CI/CD Integration

### Recommended Test Execution
```yaml
# .github/workflows/test.yml
- run: npm run test:unit      # Fast unit tests
- run: npm run test:integration # Integration tests
- run: npm run test:e2e       # End-to-end tests
- run: npm run test:security  # Security validation
- run: npm run test:coverage  # Coverage reporting
```

### Parallel Execution Strategy
- Unit tests: Parallel execution (fast, independent)
- Integration tests: Sequential execution (state dependencies)
- E2E tests: Sequential execution (full workflow dependencies)
- Security tests: Sequential execution (comprehensive validation)

## Test Quality Metrics

### Coverage Goals
- **Line Coverage**: >80% for all contracts
- **Function Coverage**: >90% for critical functions
- **Branch Coverage**: >75% for conditional logic

### Performance Goals
- **Test Execution Time**: <10 minutes total
- **Individual Test Time**: <30 seconds per test
- **Gas Reporting**: Enabled for all marketplace operations

### Quality Goals
- **Zero Failing Tests**: All tests must pass
- **Security Validation**: All audit fixes verified
- **Error Handling**: All error paths tested
- **Edge Cases**: Boundary conditions covered