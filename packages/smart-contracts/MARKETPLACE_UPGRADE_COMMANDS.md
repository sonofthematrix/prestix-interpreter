# Marketplace Upgrade Commands Reference

## Quick Reference

### Upgrade Marketplace to Latest Implementation
```bash
bun run hardhat run scripts/upgrade-marketplace-to-latest.ts --network sepolia
```

This script:
1. Checks upgrade permissions (UPGRADER_ROLE or ProxyAdmin owner)
2. Upgrades marketplace proxy to latest implementation
3. Configures `tokenFactory404` address
4. Verifies all changes

### Fix ERC404 Configuration Only
```bash
bun run hardhat run scripts/fix-marketplace-404-configuration.ts --network sepolia
```

This script:
1. Grants `TOKEN_CREATOR_ROLE` to marketplace on 404 factory
2. Configures `tokenFactory404` address (if function exists)
3. Verifies token registration

### Verify Purchase Transaction Requirements
```bash
bun run hardhat run scripts/verify-purchase-transaction.ts --network sepolia
```

This script verifies:
- Marketplace has required roles
- Token is registered in factory
- Marketplace configuration is correct

## Contract Addresses (Sepolia)

- **Marketplace Proxy**: `0x5295d340a0B06A2552C2169E5D238849550ea9Fe`
- **Latest Implementation**: `0x3e8b80714196ecb6925150347215bdf4c1420a8d`
- **Factory 404**: `0x7a6f7dE826064903f2e419833b9633560217FEe2`
- **ProxyAdmin**: `0xB8AD57FC91066Bba784186A307D9b0271ce4d789`

## Upgrade Pattern

**RWAMarketplace uses UUPS pattern**:
- Upgrades via `marketplace.upgradeTo(newImplementation)`
- Requires `UPGRADER_ROLE` on marketplace proxy
- Deployer must have `UPGRADER_ROLE` to perform upgrade

## Environment Variables Required

- `INFURA_API_KEY` or `NEXT_PUBLIC_INFURA_API_KEY` (for Sepolia RPC)
- `ETHERSCAN_API_KEY` (for verification, optional)
- `PRIVATE_KEY` (deployer private key)

## Success Indicators

After running upgrade script, verify:
- ✅ Proxy implementation matches target address
- ✅ `tokenFactory404` is configured (not zero address)
- ✅ Marketplace has `TOKEN_CREATOR_ROLE` on 404 factory
- ✅ All transactions confirmed on Etherscan

## Related Documentation

- [Marketplace Upgrade Procedures](.cursor/rules/marketplace-upgrade-procedures.mdc)
- [Marketplace 404 Fixes Applied](MARKETPLACE_404_FIXES_APPLIED.md)
- [Sepolia Deployment Architecture](.cursor/rules/sepolia-deployment-architecture.mdc)

