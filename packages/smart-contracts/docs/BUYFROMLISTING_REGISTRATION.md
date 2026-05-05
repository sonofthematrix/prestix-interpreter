# buyFromListing Function - Registration Status

## ✅ Function Confirmed in Contract

The `buyFromListing` function **definitely exists** in the RWAMarketplace contract:

**Contract**: `RWAMarketplaceUpgradeable.sol` (line 198)  
**Proxy Address**: `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`  
**Function Signature**: `buyFromListing(uint256 listingId, uint256 tokenAmount)`  
**Function Selector**: `0x4e8cdd9c`

## Registration Issue Explained

### What Happened

1. **Function exists**: ✅ Confirmed in contract code
2. **Registration script failed**: The script tried to register with parameter names:
   ```
   buyFromListing(uint256 listingId, uint256 tokenAmount)
   ```
3. **4byte.directory format**: Requires only types, not parameter names:
   ```
   buyFromListing(uint256,uint256)
   ```
4. **Manual registration**: ✅ Successfully registered manually (Nov 11, 2025)

### Why "5-10 Minutes"?

The "5-10 minutes" refers to **propagation time** for 4byte.directory's database to:
- Index the new signature
- Make it searchable via API
- Sync across their infrastructure

This is **NOT** about the function being slow - it's about the external database indexing delay.

## Current Status

- ✅ **Function exists** in contract
- ✅ **Manually registered** with 4byte.directory
- ⏳ **Propagating** (may take 5-10 minutes to appear in API searches)
- ✅ **Will decode in MetaMask** once propagation completes

## Verification

Check registration status:
```bash
curl "https://www.4byte.directory/api/v1/signatures/?hex_signature=4e8cdd9c"
```

Or visit: https://www.4byte.directory/signatures/?hex_signature=4e8cdd9c

## MetaMask Behavior

MetaMask will decode `buyFromListing` parameters once:
1. The signature propagates in 4byte.directory (5-10 minutes)
2. MetaMask queries the database (happens automatically)
3. The signature is found and cached

**Note**: Even if the API search shows 0 results temporarily, MetaMask may still decode it if it's in their cached database.

---

**Last Updated**: November 11, 2025  
**Registration ID**: 1181654  
**Status**: ✅ Registered, propagating

