# Proxy Fixture Testing Guide

## Overview

The `proxy-fixture.ts` provides a comprehensive testing environment that deploys proper proxy contracts with optimization enabled (200 runs), simulating production deployment patterns for testing staking and withdrawal operations at different durations.

## Key Features

✅ **Optimization Enabled**: All contracts compiled with 200 optimization runs  
✅ **Proxy Pattern**: Simulates OpenZeppelin TransparentProxy deployment  
✅ **Multiple Pool Support**: Create pools with different lock durations  
✅ **Revenue Integration**: Full TigerRevenue and TigerStaking integration  
✅ **Test Helpers**: Built-in functions for time advancement and withdrawal testing

## Quick Start

```typescript
import {
  deployCompleteEcosystemWithProxies,
  setupProxyTestEnvironment,
  createTestPoolsWithDurations,
  testStakingAtDuration,
  PROXY_TEST_CONFIG,
} from "./utils/proxy-fixture";

describe("Your Staking Tests", function () {
  let fixtureData: ProxyFixtureData;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;

  before(async function () {
    const signers = await ethers.getSigners();
    [deployer, alice] = signers;

    // Deploy complete ecosystem with proxy patterns
    fixtureData = await deployCompleteEcosystemWithProxies(signers);

    // Setup test environment with user funding
    await setupProxyTestEnvironment(fixtureData, [alice], {
      fundingAmount: PROXY_TEST_CONFIG.FUNDING_AMOUNTS.LARGE,
      setupApprovals: true,
    });
  });

  it("Should test staking and withdrawal", async function () {
    // Your test logic here
  });
});
```

## Available Functions

### `deployCompleteEcosystemWithProxies(signers)`

Deploys the complete KAGE ecosystem with proxy patterns:

- TIGERPALACE token (with tax system)
- RewardDistributor
- TigerRevenue (implementation + proxy)
- TigerStaking (implementation + proxy)
- All contracts properly initialized and connected

### `setupProxyTestEnvironment(fixtureData, users, options)`

Sets up test users with funding and approvals:

```typescript
await setupProxyTestEnvironment(fixtureData, [alice, bob], {
  fundingAmount: ethers.utils.parseEther("10000"), // 10K KAGE per user
  setupApprovals: true, // Auto-approve tokens for staking
});
```

### `createTestPoolsWithDurations(fixtureData, deployer)`

Creates multiple pools with different configurations:

- **Pool 0**: Flexible (0 lock, 10% apy, unlimited cap)
- **Pool 1**: 30-day lock (12% apy, 100K cap)
- **Pool 2**: 90-day lock (15% apy, 50K cap)
- **Pool 3**: 180-day lock (20% apy, 25K cap)

### `testStakingAtDuration(fixtureData, user, poolId, amount, duration, description)`

Helper function that:

1. Stakes tokens for a user
2. Advances time by specified duration
3. Attempts withdrawal
4. Returns success status and rewards earned

## Duration Constants

```typescript
PROXY_TEST_CONFIG.DURATIONS = {
  FLEXIBLE: 0,
  DAYS_7: 7 * 24 * 60 * 60,
  DAYS_30: 30 * 24 * 60 * 60,
  DAYS_90: 90 * 24 * 60 * 60,
  DAYS_180: 180 * 24 * 60 * 60,
  DAYS_365: 365 * 24 * 60 * 60,
};
```

## Example Test Scenarios

### Basic Staking Test

```typescript
it("Should stake and withdraw from flexible pool", async function () {
  const poolId = 0;
  const stakeAmount = ethers.utils.parseEther("1000");

  const result = await testStakingAtDuration(
    fixtureData,
    alice,
    poolId,
    stakeAmount,
    0, // No waiting
    "Flexible Pool Test",
  );

  expect(result.success).to.be.true;
});
```

### Duration Testing

```typescript
it("Should test early vs mature withdrawal", async function () {
  const poolId = 1; // 30-day pool
  const stakeAmount = ethers.utils.parseEther("1000");

  // Early withdrawal (day 15)
  const earlyResult = await testStakingAtDuration(
    fixtureData,
    alice,
    poolId,
    stakeAmount,
    PROXY_TEST_CONFIG.DURATIONS.DAYS_30 / 2,
    "Early Withdrawal",
  );

  // Mature withdrawal (day 35)
  const matureResult = await testStakingAtDuration(
    fixtureData,
    bob,
    poolId,
    stakeAmount,
    PROXY_TEST_CONFIG.DURATIONS.DAYS_30 + 5 * 24 * 60 * 60,
    "Mature Withdrawal",
  );

  // Compare results
  expect(matureResult.success).to.be.true;
  if (matureResult.rewards && earlyResult.rewards) {
    expect(matureResult.rewards).to.be.gte(earlyResult.rewards);
  }
});
```

### Manual Staking (Fine-grained Control)

```typescript
it("Should manually test staking operations", async function () {
  const poolId = 2;
  const stakeAmount = ethers.utils.parseEther("2000");

  // Manual stake
  await fixtureData.kageToken
    .connect(alice)
    .approve(fixtureData.kageMultiV2.address, stakeAmount);
  await fixtureData.kageMultiV2
    .connect(alice)
    .stake(poolId, stakeAmount);

  // Check staking data
  const userStake = await fixtureData.kageMultiV2.kageGetUserStakeInfo(
    poolId,
    alice.address,
  );
  expect(userStake.stakedAmount).to.equal(stakeAmount);

  // Advance time
  await ethers.provider.send("evm_increaseTime", [
    PROXY_TEST_CONFIG.DURATIONS.DAYS_90,
  ]);
  await ethers.provider.send("evm_mine", []);

  // Manual withdraw
  await fixtureData.kageMultiV2
    .connect(alice)
    .kageWithdraw(poolId, stakeAmount);
});
```

## Contract Addresses Access

```typescript
// Access deployed contract instances
const kageToken = fixtureData.kageToken;
const kageMultiV2 = fixtureData.kageMultiV2;
const kageRevenue = fixtureData.kageRevenue;
const rewardDistributor = fixtureData.rewardDistributor;

// Check deployment info
console.log("Gas used:", fixtureData.deploymentInfo.gasUsed);
console.log("Network:", fixtureData.deploymentInfo.network);
```

## Optimization Verification

The fixture ensures contracts are deployed with optimization:

- **Solidity Version**: 0.8.27
- **Optimizer**: Enabled with 200 runs
- **viaIR**: False advanced optimizations disabled
- **Gas Target**: 6,000,000 gas blocks

You can verify optimization in your tests:

```typescript
it("Should verify optimization is enabled", async function () {
  // Contracts should be functional and gas-efficient
  expect(fixtureData.kageMultiV2.address).to.not.equal(
    ethers.constants.AddressZero,
  );

  // Check gas usage (logged in deploymentInfo)
  const gasUsed = fixtureData.deploymentInfo.gasUsed;
  expect(gasUsed.kageMultiV2Impl).to.be.below(6000000); // Should be optimized
});
```

## Running the Example

```bash
# Run the example test file
npx hardhat test test/proxy-staking-example.spec.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test test/proxy-staking-example.spec.ts
```

## Best Practices

1. **Use before() hooks** for ecosystem setup (expensive operations)
2. **Test different durations** to verify lock mechanisms
3. **Check rewards calculation** for different apy rates
4. **Test edge cases** like minimum stakes and pool caps
5. **Verify proxy functionality** matches production deployment
6. **Monitor gas usage** to ensure optimization is working

## Integration with Existing Tests

The proxy fixture can be used alongside existing test files. It provides a more production-like environment compared to the basic fixture while maintaining the same interface patterns.
