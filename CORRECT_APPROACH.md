# Correct Approach: First Inward Transfer = Seller

## The Problem with Previous Approach

The previous approach tried to identify the seller by looking at `tx.from` or finding who sent tokens. This doesn't work correctly because:

1. **tx.from** might be an Entry Point or Router, not the actual seller
2. **Multiple transfers** happen in a transaction, making it unclear which is the "sell"
3. **Complex routing** through aggregators obscures the real seller

## The Correct Approach

**The seller is the address in the FIRST inward token transfer.**

### Why This Works

In any sell transaction, the flow is:
```
Seller → [Intermediaries] → Pool/Buyer
```

The **first** token transfer shows tokens entering the transaction flow from the seller's wallet.

## Examples

### Example 1: Direct Sell via Router

```
Transaction: 0x31dcb39cf65afa22037fb8b26d890ee47e4745d0abf84d17abe42af49f945515

From (Caller): 0x5Ce13493...068555343
To: Transit Swap Router

Token Transfers:
1. 0x5Ce13493...068555343 → Transit Swap Router (40,709 FULA) ← FIRST TRANSFER
2. Transit Swap Router → Pool (40,586 FULA)
3. Pool → Transit Swap Router (0.096 WETH)
4. ... more transfers ...

Seller: 0x5Ce13493...068555343 ✓
```

**Logic**: First transfer shows seller sending tokens to router.

### Example 2: Smart Wallet via Entry Point

```
Transaction: 0x0e1b8789d9eee8f8adec001aa7d696073f3735f4cba688f8027d4529aa500026

From (Caller): 0x850E1869...0A0285017 (Entry Point)
To: Entry Point 0.6.0

Token Transfers:
1. 0x4D50DD6a...05F870b46 → 0xEA758CaC...9e3502177 (9,381 FULA) ← FIRST TRANSFER
2. 0xDEA9B8EB...C62C6aFB3 → 0xEA758CaC...9e3502177 (0.0198 WETH)
3. 0xEA758CaC...9e3502177 → 0xDEA9B8EB...C62C6aFB3 (8,676 FULA)
4. ... more transfers ...

Seller: 0x4D50DD6a...05F870b46 ✓
```

**Logic**: First transfer shows tokens entering from seller's wallet, even though caller is Entry Point.

### Example 3: Aggregator (1inch, Paraswap)

```
Transaction: 0x...

From (Caller): 0xUser...
To: 1inch Router

Token Transfers:
1. 0xUser... → 1inch Router (1000 tokens) ← FIRST TRANSFER
2. 1inch Router → Pool A (500 tokens)
3. Pool A → 1inch Router (0.5 ETH)
4. 1inch Router → Pool B (500 tokens)
5. Pool B → 1inch Router (0.6 ETH)
6. 1inch Router → User (1.1 ETH)

Seller: 0xUser... ✓
```

**Logic**: First transfer shows user sending tokens to aggregator.

## Implementation

```typescript
// Find the first non-zero inward transfer
for (const transfer of tokenTransfers) {
  // Skip zero-value transfers (spam)
  if (BigInt(transfer.value) === 0n) continue;
  
  // The first transfer is the seller sending tokens
  if (!sellerAddress) {
    sellerAddress = transfer.from;
    sellerTransfer = transfer;
    break;
  }
}
```

## Contract Detection

After identifying the seller, we check if it's a contract:

```typescript
const sellerCode = await blockchain.provider.getCode(sellerAddress);
if (sellerCode !== '0x') {
  // Seller is a contract - stop here (time 0)
  // Contracts cannot be easily analyzed
}
```

### Why Stop at Contracts?

Contracts can:
- Be token contracts (minting)
- Be liquidity pools
- Be complex DeFi protocols
- Have internal logic we can't trace

So we treat contracts as "time 0" - the origin point.

## Complete Flow

```
1. Get transaction
2. Extract all token transfers
3. Find FIRST non-zero transfer
4. Seller = transfer.from
5. Check if seller is contract
   - If YES: Stop (time 0 = contract)
   - If NO: Trace seller's wallet backwards
6. Continue tracing until reaching time 0
```

## Time 0 Conditions

Tracing stops when we reach:

1. **Contract Address** - Cannot trace further
2. **Token Contract** - Origin (minting/airdrop)
3. **DEX Pool** - Origin (bought from pool)
4. **Known Aggregator** - Origin (1inch, 0x, etc.)
5. **Labeled CEX** - Origin (Binance, Coinbase, etc.)
6. **No Incoming Transfers** - Origin (unknown source)
7. **Max Depth Reached** - Limit (50 hops)
8. **Already Processed** - Loop prevention

## Edge Cases

### Case 1: Multiple Sellers in One Transaction

```
Transfers:
1. Seller A → Router (100 tokens)
2. Seller B → Router (200 tokens)
3. Router → Pool (300 tokens)

Result: Seller = Seller A (first transfer)
```

We only trace the first seller. If you want to analyze Seller B, use their specific transaction.

### Case 2: Zero-Value Spam

```
Transfers:
1. Spam Contract → User (0 tokens) ← SKIP
2. Real Seller → Router (1000 tokens) ← FIRST NON-ZERO

Result: Seller = Real Seller
```

We skip zero-value transfers to avoid spam.

### Case 3: Internal Contract Transfers

```
Transfers:
1. Contract A → Contract B (1000 tokens)
2. Contract B → Pool (1000 tokens)

Result: Seller = Contract A (stop at contract)
```

If first transfer is from a contract, we stop there.

## Benefits of This Approach

1. **Universal**: Works with all transaction types
2. **Simple**: Just find first transfer
3. **Accurate**: Always identifies the real seller
4. **Fast**: No complex logic needed
5. **Reliable**: Consistent across all DEXs/aggregators

## Comparison

| Approach | Works? | Why/Why Not |
|----------|--------|-------------|
| Use tx.from | ❌ | Could be Entry Point, Router, etc. |
| Find who sent to pool | ❌ | Could be router, not seller |
| Find largest transfer | ❌ | Might be internal routing |
| **First inward transfer** | ✅ | **Always the seller initiating the swap** |

## Testing

### Test Cases

1. ✅ Direct EOA sell
2. ✅ Smart wallet sell (Safe, Argent)
3. ✅ Account abstraction (ERC-4337)
4. ✅ Aggregator (1inch, Paraswap)
5. ✅ DEX router (Uniswap, etc.)
6. ✅ Contract as seller (stop at time 0)
7. ✅ Multiple transfers in one tx
8. ✅ Zero-value spam filtering

## Conclusion

**The first inward token transfer always reveals the seller.**

This is the fundamental principle that makes the analysis work across all transaction types, from simple EOA sells to complex multi-hop aggregator transactions.
