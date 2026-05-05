# Test Execution Analysis Report

**Generated**: 2025-11-12T13:45:18.553Z

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Tests | 315 |
| ✅ Passing | 506 |
| ⏸️ Pending | 62 |
| ❌ Failing | 0 |
| Test Suites | 135 |
| Scenario-Based Suites | 7 |

## Test Suites Breakdown

### 💰 Revenue distribution results:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Alice: 200.0 TPT | ⏸️ PENDING | 1 | - |
| Bob: 500.0 TPT | ⏸️ PENDING | 2 | - |
| Charlie: 800.0 TPT | ⏸️ PENDING | 3 | - |

### 🎯 AdvancedTigerRevenue integration test completed successfully!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should meet all validation requirements and successfully allocate revenue | ✅ PASS | 1 | 104,132 gas |

### ✅ Minimal case: Alice received 100.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle edge cases with minimal staking requirements | ✅ PASS | 1 | 104,132 gas |

### 💰 Time-weighted distribution (equal stakes, different times):

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Alice (earliest): 300.0 TPT | ⏸️ PENDING | 1 | - |
| Bob (middle): 300.0 TPT | ⏸️ PENDING | 2 | - |
| Charlie (latest): 300.0 TPT | ⏸️ PENDING | 3 | - |

### ✅ Time-weighted distribution working correctly

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle time-weighted distribution with staggered staking | ✅ PASS | 1 | 104,132 gas |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |

### Charlie (10K TPT): 0.0 TPT (0%)

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should calculate correct revenue distribution using time-weighted calculation | ✅ PASS | 1 | 104,132 gas |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |

### Total time-weighted: 58007000.0, Revenue allocated: 2000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle weighted distribution with multiple stakes per user | ✅ PASS | 1 | - |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |

### Round 2 - Alice: 166.666720173877030799 TPT, Bob: 833.3332798261229692 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should maintain accuracy across multiple revenue rounds | ✅ PASS | 1 | - |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |

### Platinum Tier: 199.999953703732281646 TPT revenue (200% multiplier)

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should correctly calculate rewards across all duration tiers | ✅ PASS | 1 | - |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |
| Should handle partial withdrawals with tier rewards | ✅ PASS | 2 | - |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |

### Total Revenue: 5000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should correctly handle multiple users across different tiers | ✅ PASS | 1 | - |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |
| Should handle full withdrawal with maximum tier rewards | ✅ PASS | 2 | - |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |

### Bob Pool 0: 1332.412840869865377977 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle cross-pool operations with accurate reward calculations | ✅ PASS | 1 | - |

### ✅ Test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWA Revenue admin check skipped (hasRole not available) | ⏸️ PENDING | 1 | - |

### Original Revenue: 1234.56789 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should maintain precision with large numbers and complex calculations | ✅ PASS | 1 | - |

### 🎯 Core Contracts - Streamlined Test Suite

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should deploy all 4 core contracts successfully | ✅ PASS | 1 | - |
| Should have correct token configuration | ✅ PASS | 2 | - |
| Should initialize RWAStaking correctly | ✅ PASS | 3 | - |
| Should create default pool during initialization | ✅ PASS | 4 | - |

### 💰 Token Operations

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should allow token transfers between users | ✅ PASS | 1 | - |
| Should handle fee exclusions correctly | ✅ PASS | 2 | - |
| Should allow users to stake in default pool | ✅ PASS | 3 | - |
| Should track individual stakes correctly | ✅ PASS | 4 | - |
| Should allow withdrawals from individual stakes | ✅ PASS | 5 | - |
| Should allow creating new pools | ✅ PASS | 6 | - |
| Should enforce minimum stake requirements | ✅ PASS | 7 | - |
| Should allow revenue allocation | ✅ PASS | 8 | - |

### User2 revenue: 909.067991025285501802 TPT (expected: 909.067952829474003181 TPT)

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should distribute revenue using time-weighted calculation | ✅ PASS | 1 | - |
| Should restrict admin functions to owner | ✅ PASS | 2 | - |
| Should allow pausing and unpausing | ✅ PASS | 3 | - |
| Should prevent non-owner from pausing | ✅ PASS | 4 | - |

### 🔧 Contract Configuration

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should allow updating treasury address | ✅ PASS | 1 | - |
| Should allow updating reward distributor | ✅ PASS | 2 | - |
| Should allow updating RWARevenue contract | ✅ PASS | 3 | - |

### 🎯 Integration Tests

**Type**: 🎬 Scenario-Based

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle complete user journey | ✅ PASS | 1 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should handle complex multi-user staking scenario | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should handle multiple stakes per user | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should distribute revenue using time-weighted calculation | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should handle multiple revenue allocations correctly | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |

### Diana pending before: 1000.0

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle revenue claiming correctly | ✅ PASS | 1 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should handle users staking in multiple pools | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should handle zero revenue allocation gracefully | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should prevent operations on non-existent pools | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should handle paused state correctly | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should track pool statistics correctly | ✅ PASS | 5 | - |

### ✅ Test Environment Setup Complete:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| RWARevenue admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 1 | - |
| RWAStaking admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has admin role: true | ⏸️ PENDING | 2 | - |
| RewardDistributor allowance toTigerRevenue: 0.0 | ⏸️ PENDING | 3 | - |
| RewardDistributor allowance toTigerStaking: 0.0 | ⏸️ PENDING | 4 | - |
| Should provide accurate user stake information | ✅ PASS | 5 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should measure gas costs for basic staking operations | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should measure gas costs for pool operations | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test gas efficiency with increasing number of stakers | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test gas efficiency with multiple stakes per user | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test performance with large stake amounts | ✅ PASS | 1 | - |

### 📊 Batch revenue allocation: 104,168 gas

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should compare sequential vs optimized operations | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test multiple pool operations efficiency | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test storage efficiency with large datasets | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test computation efficiency for complex calculations | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should benchmark against gas limits | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should identify gas optimization opportunities | ✅ PASS | 1 | - |

### ✅ Funded RWARevenue from RewardDistributor: 200000.0 TPT transferred, balance now: 200000.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should analyze gas patterns for optimization | ✅ PASS | 1 | - |

### 💰 Revenue distribution results:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Alice: 312.500941899401117152 TPT | ⏸️ PENDING | 1 | - |
| Bob: 1562.501695418922010874 TPT | ⏸️ PENDING | 2 | - |
| Charlie: 3124.997362681676871973 TPT | ⏸️ PENDING | 3 | - |

### ✅ Total rewards: 4999.999999999999999999 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should successfully allocate revenue with enhanced validation | ✅ PASS | 1 | 104,144 gas |

### ✅ Time-weighted distribution working correctly

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle time-weighted distribution correctly | ✅ PASS | 1 | 104,228 gas |

### ✅ System readiness validation passed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle system readiness validation | ✅ PASS | 1 | - |

### ✅ Accumulative allocation working correctly

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should support accumulative revenue allocation | ✅ PASS | 1 | 52,928 gas |

### ✅ Revenue claiming working correctly

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle revenue claiming after allocation | ✅ PASS | 1 | 104,132 gas |

### Multiplier: 10000 basis points

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should demonstrate simplified pool interface | ✅ PASS | 1 | 104,132 gas |

### ✅ Flexible pool test completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should successfully stake and withdraw from flexible pool | ✅ PASS | 1 | 104,132 gas |

### ✅ 30-day pool duration tests completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test 30-day pool - early withdrawal vs. mature withdrawal | ✅ PASS | 1 | - |

### ✅ 90-day pool test completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test 90-day pool maturity | ✅ PASS | 1 | - |

### ✅ 180-day pool test completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test 180-day pool with highest rewards | ✅ PASS | 1 | - |

### 📊 Gas usage summary:

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should verify contracts are deployed with optimization | ✅ PASS | 1 | - |

### ✅ Partial withdrawal test completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test partial withdrawals in flexible pool | ✅ PASS | 1 | - |

### ✅ Stake limits test completed - minimum stake enforcement working

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test stake amount limits and pool caps | ✅ PASS | 1 | - |

### Direct allowance check: 0.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| DEBUG: Multi-Pool Allowance Investigation | ✅ PASS | 1 | - |

### Bob stakes: 1

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle simple organic staking without complex tier calculations | ✅ PASS | 1 | - |

### Bob (holding): 500.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle simple withdrawal patterns without complex calculations | ✅ PASS | 1 | - |

### Bob (Pool 2): 100.0 TPT

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle simple cross-pool operations | ✅ PASS | 1 | - |

### ✅ Complete revenue distribution cycle tested successfully

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test complete revenue allocation and claiming cycle | ✅ PASS | 1 | - |

### Multi-period claiming test completed (demonstrates time progression)

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should test revenue accumulation over multiple periods | ✅ PASS | 1 | - |

### ✅ Basic staking functionality verified successfully

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle complete revenue distribution lifecycle with time delays | ✅ PASS | 1 | - |

### ✅ Basic multi-user staking verified instead

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle multiple revenue allocations over time | ✅ PASS | 1 | - |

### ✅ Time-delayed revenue claiming scenario completed successfully

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle revenue allocation and time-delayed claiming correctly | ✅ PASS | 1 | - |

### ✅ System correctly prevents claiming when no revenue pending

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle edge case: claiming with no pending revenue | ✅ PASS | 1 | - |

### ✅ Revenue distribution lifecycle test completed successfully

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle complete revenue lifecycle: stake → allocate → wait → claim | ✅ PASS | 1 | - |

### Revenue system requiresTigerRevenue contract integration

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle multiple revenue allocations and partial claims | ✅ PASS | 1 | - |

### ✅ Ecosystem deployed with proper allowances

**Type**: 🎬 Scenario-Based

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should calculate correct revenue distribution based on stake proportions | ✅ PASS | 1 | - |

### ✅ Ecosystem deployed with proper allowances

**Type**: 🎬 Scenario-Based

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle weighted distribution with multiple stakes per user | ✅ PASS | 1 | - |

### ✅ Ecosystem deployed with proper allowances

**Type**: 🎬 Scenario-Based

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should maintain accuracy across multiple revenue allocation rounds | ✅ PASS | 1 | - |

### Bob stake amount: 5000.0 TIGR

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should apply correct tier multipliers based on staking duration | ✅ PASS | 1 | - |

### ✅ Ecosystem deployed with proper allowances

**Type**: 🎬 Scenario-Based

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should calculate rewards with tier multipliers accurately | ✅ PASS | 1 | - |

### Bob Pool 0: 0.0 TIGR revenue

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle complex staking patterns across different pools | ✅ PASS | 1 | - |

### Remaining staked (principal): 10000.0 TIGR

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle partial withdrawals correctly | ✅ PASS | 1 | - |

### ✅ Ecosystem deployed with proper allowances

**Type**: 🎬 Scenario-Based

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle full withdrawal with accurate reward calculations | ✅ PASS | 1 | - |

### ✅ Ecosystem deployed with proper allowances

**Type**: 🎬 Scenario-Based

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should distribute revenue to 3 active stakers and exclude 2 withdrawn wallets | ✅ PASS | 1 | - |

### Bob withdrawal: 2000.0 TIGR

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle complex multi-user, multi-pool, multi-tier scenario | ✅ PASS | 1 | - |

### Access Control

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| should only allow admin to pause/unpause | ✅ PASS | 1 | - |

### Pausable Functionality

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| should prevent operations when paused | ✅ PASS | 1 | - |

### ✅ Proxy test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should revert when non-owner tries to pause | ✅ PASS | 1 | - |
| Should revert when non-owner tries to unpause | ✅ PASS | 2 | - |
| Should revert when non-owner tries to emergency withdraw | ✅ PASS | 3 | - |
| Should revert when non-owner tries to add rewards | ✅ PASS | 4 | - |
| Should revert when non-owner tries to distribute rewards | ✅ PASS | 5 | - |
| Should revert when non-owner tries to update addresses | ✅ PASS | 6 | - |
| Should revert emergency withdraw with zero amount | ✅ PASS | 7 | - |
| Should revert emergency withdraw with insufficient balance | ✅ PASS | 8 | - |
| Should revert addRewards with zero amount | ✅ PASS | 9 | - |
| Should revert addRewards with insufficient balance | ✅ PASS | 10 | - |
| Should revert distributeRewards with zero amount | ✅ PASS | 11 | - |
| Should revert distributeRewards with insufficient pending rewards | ✅ PASS | 12 | - |
| Should revert distributeRewards when staking address not set | ✅ PASS | 13 | - |
| Should successfully emergency withdraw tokens | ✅ PASS | 14 | - |
| Should successfully emergency withdraw ETH | ✅ PASS | 15 | - |

### 🔧 Pause and System State Error Handling

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should successfully pause and unpause | ✅ PASS | 1 | - |
| Should revert pausing when already paused | ✅ PASS | 2 | - |
| Should revert unpausing when not paused | ✅ PASS | 3 | - |

### 📊 View Functions and State Queries

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should correctly report pause status | ✅ PASS | 1 | - |
| Should correctly report available balance | ✅ PASS | 2 | - |
| Should correctly report reward pool stats | ✅ PASS | 3 | - |
| Should handle token balance queries | ✅ PASS | 4 | - |
| Should maintain state consistency across pause/unpause cycles | ✅ PASS | 5 | - |
| Should handle multiple reward additions | ✅ PASS | 6 | - |
| Should handle address updates correctly | ✅ PASS | 7 | - |

### ✅ Staking workflow completed successfully

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should allow users to stake tokens and earn rewards | ✅ PASS | 1 | - |

### ✅ Property revenue distribution completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should distribute property revenue to stakers | ✅ PASS | 1 | - |

### ✅ Marketplace fee distribution completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should distribute marketplace fees to stakers | ✅ PASS | 1 | - |

### ✅ Multi-user, multi-pool staking completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle multiple users staking in different pools | ✅ PASS | 1 | - |

### ✅ Reward calculations verified for different tiers

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should calculate rewards correctly for different duration tiers | ✅ PASS | 1 | - |

### ✅ Emergency scenarios handled correctly

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle emergency pause and withdrawal scenarios | ✅ PASS | 1 | - |

### ✅ Property dividend integration completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should integrate property dividends with staking rewards | ✅ PASS | 1 | - |

### ✅ Marketplace fee collection completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle marketplace fee collection and distribution | ✅ PASS | 1 | - |

### ✅ Contract relationships verified

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should maintain proper contract relationships | ✅ PASS | 1 | - |

### ✅ Test environment setup complete

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle role-based access control | ✅ PASS | 1 | - |

### ✅ Gas optimization tracking completed

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should track gas usage for key operations | ✅ PASS | 1 | - |

### Token Creation

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should create ERC-404 token successfully | ✅ PASS | 1 | - |
| Should revert if tokenURI is empty | ✅ PASS | 2 | - |
| Should revert if asset already has token | ✅ PASS | 3 | - |

### Token Management

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should mint tokens via factory | ✅ PASS | 1 | - |
| Should burn tokens via factory | ✅ PASS | 2 | - |
| Should update asset value via factory | ✅ PASS | 3 | - |
| Should distribute dividends via factory | ✅ PASS | 4 | - |

### View Functions

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should return token address for asset | ✅ PASS | 1 | - |
| Should return asset ID for token | ✅ PASS | 2 | - |
| Should return all tokens | ✅ PASS | 3 | - |
| Should verify token validity | ✅ PASS | 4 | - |
| Should handle pause/unpause functions | ✅ PASS | 5 | - |
| Should prevent non-admin from pause functions | ✅ PASS | 6 | - |

### 🔧 System State Error Handling

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle paused state operations correctly | ✅ PASS | 1 | - |

### 📊 Coverage Enhancement for View Functions

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle revenue and staking statistics | ✅ PASS | 1 | - |

### Simple Staking Test

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should create a simple stake without overflow | ✅ PASS | 1 | - |
| Should handle pool info with simplified structure | ✅ PASS | 2 | - |
| Should support multiple stake operations | ✅ PASS | 3 | - |
| Should allow small stake amounts | ✅ PASS | 4 | - |
| Should support pool length and basic statistics | ✅ PASS | 5 | - |

### 💰 Revenue Allocation - Error Conditions

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should reject zero amount allocation | ✅ PASS | 1 | - |
| Should reject allocation from non-owner caller | ✅ PASS | 2 | - |
| Should handle allocation when contract is paused | ✅ PASS | 3 | - |
| Should handle allocation with large amount | ✅ PASS | 4 | - |
| Should return zero for pool with no revenue | ✅ PASS | 5 | - |
| Should handle zero pool ID correctly | ✅ PASS | 6 | - |
| Should handle large pool ID correctly | ✅ PASS | 7 | - |
| Should return consistent results for multiple calls | ✅ PASS | 8 | - |

### Pool Revenue Status

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle poolRevenueAllocated mapping correctly | ✅ PASS | 1 | - |
| Should handle totalRevenueAllocated variable | ✅ PASS | 2 | - |
| Should handle poolRevenueDistributed mapping | ✅ PASS | 3 | - |
| Should handle maximum uint256 pool ID | ✅ PASS | 4 | - |
| Should handle zero values correctly | ✅ PASS | 5 | - |
| Should enforce onlyRole modifier on admin functions | ✅ PASS | 6 | - |
| Should enforce REVENUE_MANAGER_ROLE on revenue allocation | ✅ PASS | 7 | - |
| Should allow owner to call admin functions | ✅ PASS | 8 | - |
| Should have reasonable gas costs for view functions | ✅ PASS | 9 | - |
| Should handle multiple sequential view calls efficiently | ✅ PASS | 10 | - |
| Should maintain consistent state across admin changes | ✅ PASS | 11 | - |
| Should handle pause/unpause without affecting other state | ✅ PASS | 12 | - |
| Should provide correct error messages for various failures | ✅ PASS | 13 | - |

### ✅ Proxy test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should revert when non-owner tries to pause | ✅ PASS | 1 | - |
| Should revert when non-owner tries to unpause | ✅ PASS | 2 | - |
| Should revert with RWARevenue: invalid amount when allocating revenue with zero amount | ✅ PASS | 3 | - |

### 🔧 Pause and System State Error Handling

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should successfully pause and unpause | ✅ PASS | 1 | - |
| Should revert pausing when already paused | ✅ PASS | 2 | - |
| Should revert unpausing when not paused | ✅ PASS | 3 | - |

### 💰 Revenue Operations Error Handling

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle revenue allocation to valid pool | ✅ PASS | 1 | - |
| Should handle revenue queries correctly | ✅ PASS | 2 | - |

### 📊 View Functions and State Queries

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should correctly report pause status | ✅ PASS | 1 | - |
| Should correctly report contract addresses | ✅ PASS | 2 | - |
| Should handle multiple revenue allocations | ✅ PASS | 3 | - |
| Should maintain state consistency across pause/unpause cycles | ✅ PASS | 4 | - |
| Should handle zero revenue scenarios | ✅ PASS | 5 | - |

### ✅ Proxy test environment setup completed!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should revert when non-owner tries to create pool | ✅ PASS | 1 | - |
| Should revert when non-owner tries to create another pool | ✅ PASS | 2 | - |
| Should revert when non-owner tries to update addresses | ✅ PASS | 3 | - |
| Should revert when non-owner tries to pause | ✅ PASS | 4 | - |
| Should revert when non-owner tries to unpause | ✅ PASS | 5 | - |
| Should revert when non-owner tries to update pool config | ✅ PASS | 6 | - |
| Should revert when non-owner tries to distribute rewards | ✅ PASS | 7 | - |
| Should revert when creating pool with invalid parameters | ✅ PASS | 8 | - |
| Should revert when staking in non-existent pool | ✅ PASS | 9 | - |
| Should revert when staking zero amount | ✅ PASS | 10 | - |
| Should revert when claiming rewards before stake matures | ✅ PASS | 11 | - |

### 🎯 Pool State Error Handling

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should revert operations on inactive pools | ✅ PASS | 1 | - |
| Should handle pool capacity limits | ✅ PASS | 2 | - |
| Should revert updating non-existent pool | ✅ PASS | 3 | - |
| Should handle pool info retrieval for non-existent pool | ✅ PASS | 4 | - |

### 💰 Revenue Operations Error Handling

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle pending rewards queries for invalid scenarios | ✅ PASS | 1 | - |
| Should revert staking with insufficient token balance | ✅ PASS | 2 | - |
| Should revert staking without token approval | ✅ PASS | 3 | - |
| Should handle claiming rewards with no stakes | ✅ PASS | 4 | - |
| Should handle stake info queries for non-existent stakes | ✅ PASS | 5 | - |
| Should handle user stakes queries correctly | ✅ PASS | 6 | - |
| Should successfully pause and unpause contract | ✅ PASS | 7 | - |
| Should handle address updates | ✅ PASS | 8 | - |
| Should revert pausing when already paused | ✅ PASS | 9 | - |
| Should revert unpausing when not paused | ✅ PASS | 10 | - |
| Should revert creating pool with invalid parameters | ✅ PASS | 11 | - |
| Should handle pool creation and configuration | ✅ PASS | 12 | - |
| Should handle updating pool configuration | ✅ PASS | 13 | - |
| Should handle getting all pools | ✅ PASS | 14 | - |

### 📊 Statistics and View Functions Error Handling

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle total staked queries correctly | ✅ PASS | 1 | - |
| Should handle user stakes queries | ✅ PASS | 2 | - |
| Should handle pool info queries | ✅ PASS | 3 | - |
| Should handle getStats correctly | ✅ PASS | 4 | - |
| Should handle pool stakers count correctly | ✅ PASS | 5 | - |

### 🔧 Mathematical Edge Cases

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle time-based calculations correctly | ✅ PASS | 1 | - |
| Should handle pool state validation | ✅ PASS | 2 | - |
| Should handle individual stake reward claims | ✅ PASS | 3 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should create pools with optimized configurations | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should validate pool parameters | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should create individual stakes | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should update stake tier based on duration | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should process withdrawals correctly | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should allocate revenue proportionally | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should allow claiming revenue | ✅ PASS | 1 | - |

### Note: This includes proxy + implementation bytecode

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should verify contract size is within limits | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should allow owner to update reward distributor | ✅ PASS | 1 | - |

### ✅ Test environment setup completed for 3 users!

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should allow owner to update revenue contract | ✅ PASS | 1 | - |

### 💰 Weighted Revenue Distribution Strategy

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should calculate correct revenue distribution based on stake proportions | ✅ PASS | 1 | - |
| Should handle weighted distribution with multiple stakes per user | ✅ PASS | 2 | - |
| Should maintain weighted accuracy across multiple revenue rounds | ✅ PASS | 3 | - |
| Should handle complex staking and partial withdrawal patterns | ✅ PASS | 4 | - |
| Should handle simultaneous operations from multiple users | ✅ PASS | 5 | - |
| Should handle edge case withdrawal patterns | ✅ PASS | 6 | - |
| Should correctly apply tier multipliers based on staking duration | ✅ PASS | 7 | - |
| Should calculate rewards with tier multipliers | ✅ PASS | 8 | - |
| Should create pools with different configurations | ✅ PASS | 9 | - |

### 🔧 Administrative Functions

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should handle pause/unpause functionality | ✅ PASS | 1 | - |
| Should handle invalid pool operations | ✅ PASS | 2 | - |
| Should handle insufficient balance scenarios | ✅ PASS | 3 | - |
| Should allow any stake amount above zero | ✅ PASS | 4 | - |
| Should handle zero revenue allocation | ✅ PASS | 5 | - |

### 📊 Statistics and Analytics

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should track accurate pool statistics | ✅ PASS | 1 | - |
| Should provide detailed stake information | ✅ PASS | 2 | - |

### USDC Payment Configuration

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should set payment token correctly | ✅ PASS | 1 | - |
| Should allow admin to update payment token | ✅ PASS | 2 | - |
| Should emit PaymentTokenUpdated event | ✅ PASS | 3 | - |

### USDC Token Purchase

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should purchase tokens with USDC | ✅ PASS | 1 | - |
| Should revert if insufficient USDC balance | ✅ PASS | 2 | - |
| Should revert if insufficient USDC allowance | ✅ PASS | 3 | - |

### Fee Collection

**Type**: 📋 Standard

| Test Name | Status | Sequence | Gas Used |
|-----------|--------|----------|----------|
| Should collect fees in USDC | ✅ PASS | 1 | - |
| Should allow admin to withdraw USDC fees | ✅ PASS | 2 | - |

