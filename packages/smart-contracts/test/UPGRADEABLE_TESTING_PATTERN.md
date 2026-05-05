# Upgradeable Contract Testing Pattern

## Overview

All upgradeable contracts must be tested using the proper deployment pattern that matches production:

1. **Deploy implementation contract** first
2. **Deploy ProxyAdmin** (must be deployed before proxies)
3. **Deploy TransparentUpgradeableProxy** linked to implementation
4. **Initialize proxy** with proper parameters
5. **Grant admin roles** to deployer for all contracts and proxies
6. **Test upgrades** through ProxyAdmin

## Why This Pattern?

- **Matches Production**: Production deployments use ProxyAdmin and TransparentUpgradeableProxy
- **Proper Role Management**: Ensures deployer has admin roles on proxy storage (not just implementation)
- **Upgrade Testing**: Allows testing contract upgrades through ProxyAdmin
- **Security**: Verifies that only ProxyAdmin owner can perform upgrades

## Usage

### Basic Usage

```typescript
import { deployUpgradeableEcosystem, verifyUpgradeableDeployment } from "./utils/upgradeable-fixture";

describe("My Test Suite", () => {
  let deployer: SignerWithAddress;
  let fixture: any;

  beforeEach(async () => {
    [deployer, treasury] = await ethers.getSigners();
    
    // Deploy upgradeable ecosystem
    fixture = await deployUpgradeableEcosystem([deployer, treasury]);
    
    // Verify deployment
    const isValid = await verifyUpgradeableDeployment(fixture, deployer);
    expect(isValid).to.be.true;
  });
});
```

### Testing Upgrades

```typescript
import { upgradeContract } from "./utils/upgradeable-fixture";

it("Should upgrade contract through ProxyAdmin", async () => {
  // Deploy new implementation
  const NewImplementation = await ethers.getContractFactory("RWAStakingUpgradeable");
  const newImpl = await NewImplementation.deploy();
  await newImpl.waitForDeployment();

  // Perform upgrade through ProxyAdmin
  await upgradeContract(
    fixture.proxyAdmin,
    fixture.deploymentInfo.addresses.rwaStaking.proxy,
    newImpl,
    deployer,
  );
});
```

## Deployment Sequence

The `deployUpgradeableEcosystem()` function follows this sequence:

1. **TigerPalaceToken**: Deployed using `deployTigerPalaceToken()` utility
2. **ProxyAdmin**: Deployed first (required for all proxies)
3. **RWARewardDistributor**: Direct deployment (non-upgradeable)
4. **RWARevenue Implementation**: Deployed with constructor parameters
5. **RWAStakingUpgradeable Implementation**: Deployed (empty constructor)
6. **RWARevenue Proxy**: Deployed with placeholder staking address
7. **RWAStaking Proxy**: Deployed with RWARevenue proxy address
8. **RWARevenue Linkage**: Updated with RWAStaking proxy address
9. **Role Grants**: Deployer granted admin roles on all contracts
10. **Funding**: RewardDistributor funded with tokens

## Key Differences from Direct Deployment

| Aspect | Direct Deployment | Upgradeable Pattern |
|--------|------------------|-------------------|
| **Implementation** | Used directly | Deployed separately |
| **Storage** | Implementation storage | Proxy storage |
| **Roles** | Constructor grants roles | Must grant after proxy init |
| **Upgrades** | Not possible | Through ProxyAdmin |
| **Admin** | Deployer | ProxyAdmin owner |

## Contract Addresses

After deployment, `fixture.deploymentInfo.addresses` contains:

```typescript
{
  proxyAdmin: string;
  rwaStaking: {
    proxy: string;
    implementation: string;
  };
  rwaRevenue: {
    proxy: string;
    implementation: string;
  };
}
```

## Role Verification

The fixture automatically grants:
- `DEFAULT_ADMIN_ROLE` on RWAStaking proxy
- `POOL_MANAGER_ROLE` on RWAStaking proxy
- `REWARD_MANAGER_ROLE` on RWAStaking proxy
- `DEFAULT_ADMIN_ROLE` on RWARevenue proxy
- `REVENUE_MANAGER_ROLE` on RWARevenue proxy
- `REVENUE_MANAGER_ROLE` to RWAStaking proxy (for allocateRevenue calls)

## Migration Guide

### Old Pattern (Direct Deployment)
```typescript
const RWAStaking = await ethers.getContractFactory("RWAStaking");
const staking = await RWAStaking.deploy(token, revenue, distributor);
```

### New Pattern (Upgradeable)
```typescript
const fixture = await deployUpgradeableEcosystem([deployer, treasury]);
const staking = fixture.TigerStaking; // Proxy instance
```

## Example Test

See `test/upgradeable-pattern-example.spec.ts` for a complete example demonstrating:
- Proper deployment
- Role verification
- Upgrade testing
- Contract linkage verification

## Important Notes

1. **Always use proxy addresses** for testing, not implementation addresses
2. **ProxyAdmin owner** must be deployer for upgrades to work
3. **Roles are on proxy storage**, not implementation storage
4. **Contract linkage** uses proxy addresses, not implementation addresses
5. **Upgrades** must go through ProxyAdmin, not directly on proxy

