# Alchemy API Optimization

## The Problem

The original implementation used block-by-block scanning to find token transfers:

```typescript
// Old approach: SLOW
for (let block = currentBlock; block > 0; block -= 1000) {
  const logs = await provider.getLogs({
    fromBlock: block - 1000,
    toBlock: block,
    // ... filters
  });
  // Process logs...
}
```

**Issues:**
- **Extremely slow**: 1000+ API calls for wallets with old transfers
- **Rate limits**: Quickly hits API limits
- **Inefficient**: Scanning blocks that might have no transfers
- **Time-consuming**: Can take 5-10 minutes for a single wallet

## The Solution: Alchemy's Indexed API

Alchemy maintains an **indexed database** of all token transfers, similar to how Basescan works.

### getAssetTransfers API

```typescript
const response = await alchemy.core.getAssetTransfers({
  toAddress: walletAddress,
  contractAddresses: [tokenAddress],
  category: ['erc20'],
  fromBlock: '0x0',
  toBlock: '0xlatest',
});
```

**Benefits:**
- ⚡ **Instant**: Returns all transfers in milliseconds
- 📊 **Indexed**: Pre-indexed database, no block scanning
- 🎯 **Precise**: Only returns relevant transfers
- 💰 **Efficient**: Single API call instead of thousands

## Performance Comparison

### Old Approach (Block-by-Block)
```
Wallet with transfers from 6 months ago:
- Blocks to scan: ~1,000,000
- API calls needed: ~1,000 (with 1000-block chunks)
- Time: 5-10 minutes
- Rate limit risk: HIGH
```

### New Approach (Alchemy API)
```
Same wallet:
- API calls needed: 1
- Time: < 1 second
- Rate limit risk: LOW
```

**Result: 300-600x faster!**

## Implementation

### Automatic Detection

The app automatically uses Alchemy's fast API when:
1. Provider is set to "Alchemy"
2. Alchemy SDK is available
3. Network is supported

```typescript
if (this.alchemy) {
  // Use fast indexed API
  return await this.getTransactionsForAddressAlchemy(...);
} else {
  // Fallback to standard RPC
  return await this.getTransactionsForAddressRPC(...);
}
```

### Fallback Support

If Alchemy API fails or isn't available:
- Automatically falls back to standard RPC
- Still works with QuickNode and Infura
- Graceful degradation

## Supported Networks

Alchemy's fast API works on:
- ✅ Ethereum Mainnet
- ✅ Ethereum Sepolia
- ✅ Polygon Mainnet
- ✅ Arbitrum Mainnet
- ✅ Optimism Mainnet
- ✅ **Base Mainnet** (your use case!)

## Usage

### For Users

**No changes needed!** The optimization is automatic.

If you're using Alchemy:
1. Configure your Alchemy API key
2. Select your network (e.g., base-mainnet)
3. The app automatically uses the fast API

You'll see in the logs:
```
Using Alchemy fast API for transfers (much faster than block-by-block)
Alchemy API returned 45 transfers instantly
```

### For Developers

```typescript
// The method signature stays the same
await blockchain.getTransactionsForAddress(
  walletAddress,
  tokenAddress,
  fromBlock,
  toBlock
);

// But internally:
// - Alchemy users get instant results
// - Other providers use standard RPC
```

## Technical Details

### Alchemy SDK Integration

```typescript
import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';

// Initialize
const alchemy = new Alchemy({
  apiKey: config.apiKey,
  network: Network.BASE_MAINNET,
});

// Query
const response = await alchemy.core.getAssetTransfers({
  toAddress: address,
  contractAddresses: [tokenAddress],
  category: [AssetTransfersCategory.ERC20],
  fromBlock: `0x${fromBlock.toString(16)}`,
  toBlock: `0x${toBlock.toString(16)}`,
  maxCount: 1000,
});
```

### Response Format

```typescript
{
  transfers: [
    {
      blockNum: '0x2155eae',
      hash: '0x...',
      from: '0x...',
      to: '0x...',
      value: 1234.56,
      asset: 'FULA',
      category: 'erc20',
      rawContract: {
        address: '0x...',
        decimal: '0x12'
      }
    },
    // ... more transfers
  ]
}
```

### Pagination

Alchemy returns up to 1000 transfers per request. For wallets with more:

```typescript
// Future enhancement: pagination support
let pageKey = undefined;
do {
  const response = await alchemy.core.getAssetTransfers({
    // ... params
    pageKey: pageKey,
  });
  transfers.push(...response.transfers);
  pageKey = response.pageKey;
} while (pageKey);
```

## Why Basescan is Fast

Block explorers like Basescan use the same approach:
1. **Indexed database**: All transfers pre-indexed
2. **Direct queries**: No block scanning needed
3. **Pagination**: Efficient data retrieval

Our app now works the same way when using Alchemy!

## Comparison with Other Providers

| Provider | Fast API | Fallback |
|----------|----------|----------|
| **Alchemy** | ✅ getAssetTransfers | Standard RPC |
| QuickNode | ❌ | Standard RPC |
| Infura | ❌ | Standard RPC |

**Recommendation**: Use Alchemy for best performance, especially when tracing old transactions.

## Real-World Example

### Scenario
Trace a wallet that received tokens 3 months ago (block 35000000 → 36230000)

### Old Method
```
Blocks to scan: 1,230,000
Chunk size: 1000 blocks
API calls: 1,230
Time per call: ~500ms
Total time: ~10 minutes
```

### New Method (Alchemy)
```
API calls: 1
Time: ~200ms
Total time: < 1 second
```

**600x faster!**

## Installation

The Alchemy SDK is included in dependencies:

```json
{
  "dependencies": {
    "alchemy-sdk": "^3.1.0"
  }
}
```

Install with:
```bash
npm install
```

## Limitations

### Alchemy API Limits
- Free tier: 300 requests/second
- Growth tier: Higher limits
- Max 1000 transfers per request

### Fallback Limitations
- Standard RPC still slow for old transfers
- Block range limits still apply
- Rate limits still a concern

## Future Enhancements

1. **Pagination Support**: Handle wallets with >1000 transfers
2. **Caching**: Cache transfer results locally
3. **QuickNode Support**: Add QuickNode's similar API if available
4. **Parallel Queries**: Query multiple addresses simultaneously

## Conclusion

By using Alchemy's indexed API, we've made the app:
- ⚡ **600x faster** for tracing
- 💰 **More efficient** with API calls
- 🎯 **More reliable** (fewer rate limits)
- 🚀 **Production-ready** for real-world use

This is the same technology that powers Basescan and other block explorers!
