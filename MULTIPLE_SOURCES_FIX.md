# Multiple Sources Fix - Complete Token History

## Problem

The previous implementation only showed the FIRST incoming transfer for each wallet. This missed important information when wallets received tokens from multiple sources.

### Example Scenario:
```
Wallet A received tokens from:
- DEX Pool (1000 tokens)
- Airdrop Contract (500 tokens)  
- Another Wallet (200 tokens)

Old behavior: Only showed DEX Pool
New behavior: Shows ALL three sources
```

## Solution

### 1. Updated Data Structure

Added `sources` array to `TraceNode`:

```typescript
export interface TraceNode {
  // ... existing fields
  source?: TraceNode;      // Single source (backward compatibility)
  sources?: TraceNode[];   // Multiple sources (new)
  // ...
}
```

### 2. New Search Function

Changed from `findFirstIncomingTransfer` to `findAllIncomingTransfers`:

**Before:**
```typescript
// Only found the first transfer
const firstTransfer = await this.findFirstIncomingTransfer(address, block);
```

**After:**
```typescript
// Finds ALL transfers
const allTransfers = await this.findAllIncomingTransfers(address, block);
```

### 3. Smart Grouping

Groups transfers by sender and traces each unique source:

```typescript
// Group by sender
const bySender = allTransfers.reduce((acc, t) => {
  const sender = t.from.toLowerCase();
  if (!acc[sender]) acc[sender] = [];
  acc[sender].push(t);
  return acc;
}, {});

// Trace each sender
for (const sender of senders) {
  const totalFromSender = sum(transfers from this sender);
  node.sources.push(await traceToOrigin(sender, total, ...));
}
```

### 4. Bubble Map Visualization

Updated to show multiple connections:

```typescript
// Recursively build for source(s)
if (node.sources && node.sources.length > 0) {
  // Multiple sources - build all of them
  node.sources.forEach((sourceNode) => {
    buildGraph(sourceNode, currentId, depth + 1);
  });
} else if (node.source) {
  // Single source - original behavior
  buildGraph(node.source, currentId, depth + 1);
}
```

## Visual Example

### Before (Single Source):
```
[Seller] ← [Wallet A] ← [DEX Pool]
```

### After (Multiple Sources):
```
                    ┌─ [DEX Pool] (1000 tokens)
                    │
[Seller] ← [Wallet A] ─ [Airdrop Contract] (500 tokens)
                    │
                    └─ [Wallet B] (200 tokens)
```

## Detailed Logging

The new implementation provides detailed logging:

```
[Depth 0] Searching for ALL incoming transfers to 0x1234...5678...
  Found 15 total incoming transfer(s) for 0x1234...5678
    From 0xabcd...ef01: 10 transfer(s)
    From 0x9876...5432: 3 transfer(s)
    From 0xdex0...pool: 2 transfer(s)

[Depth 0] Multiple sources: 3 different addresses

[Depth 0] Tracing source 0xabcd...ef01 (10 transfer(s), total: 1000 tokens)
[Depth 0] → Recursively tracing 0xabcd...ef01...

[Depth 0] Tracing source 0x9876...5432 (3 transfer(s), total: 500 tokens)
[Depth 0] ✓ Source is origin: contract (0x9876...5432)

[Depth 0] Tracing source 0xdex0...pool (2 transfer(s), total: 200 tokens)
[Depth 0] ✓ Source is origin: dex (0xdex0...pool)
```

## Use Cases

### Use Case 1: Airdrop + Purchase
```
Wallet received:
- 1000 tokens from airdrop (contract)
- 500 tokens from DEX purchase

Bubble map shows both sources with amounts
```

### Use Case 2: Multiple Purchases
```
Wallet received:
- 100 tokens from DEX A
- 200 tokens from DEX B
- 300 tokens from Aggregator

All three sources traced independently
```

### Use Case 3: Complex Chain
```
Wallet A received from:
- Wallet B (who received from DEX)
- Wallet C (who received from Contract)

Full tree shows:
Wallet A ← Wallet B ← DEX
        ← Wallet C ← Contract
```

## Benefits

1. **Complete History**: Shows ALL token sources, not just first
2. **Accurate Amounts**: Sums transfers from same sender
3. **Better Visualization**: Bubble map shows all connections
4. **Detailed Logging**: See exactly what's being traced
5. **Backward Compatible**: Still works with single-source wallets

## Technical Details

### Grouping Logic
```typescript
// Group transfers by sender
const bySender = allTransfers.reduce((acc, t) => {
  const sender = t.from.toLowerCase();
  if (!acc[sender]) acc[sender] = [];
  acc[sender].push(t);
  return acc;
}, {} as Record<string, TokenTransfer[]>);
```

### Amount Calculation
```typescript
// Sum all transfers from same sender
const totalFromSender = senderTransfers.reduce(
  (sum, t) => sum + BigInt(t.value), 
  0n
);
```

### Timestamp Handling
```typescript
// Use earliest transfer timestamp
node.timestamp = Math.min(...allTransfers.map(t => t.timestamp));
```

## Performance Considerations

- **Alchemy API**: Single call gets ALL transfers (fast)
- **Recursive Tracing**: Each source traced independently
- **Depth Limit**: Still respects max depth (50) to prevent infinite loops
- **Caching**: Processed addresses tracked to avoid re-tracing

## Example Output

### Single Source Wallet:
```
Trace #1 - 0x1234...5678
  ↓
[0x1234...5678] (1000 tokens)
  ↓
[DEX Pool] (1000 tokens) - Origin
```

### Multiple Source Wallet:
```
Trace #1 - 0x1234...5678
  ↓
[0x1234...5678] (1700 tokens)
  ├─ [DEX Pool] (1000 tokens) - Origin
  ├─ [Airdrop] (500 tokens) - Origin  
  └─ [Wallet B] (200 tokens)
      ↓
     [DEX Pool] (200 tokens) - Origin
```

## Files Modified

1. **src/types/index.ts** - Added `sources` array to TraceNode
2. **src/utils/tracker.ts** - Implemented multi-source tracing
3. **src/components/TraceBubbleMap.tsx** - Updated visualization

## Conclusion

The app now provides a complete picture of token history by:
- Finding ALL incoming transfers
- Grouping by sender
- Tracing each source independently
- Visualizing all connections in bubble map

This gives users the full story of where tokens came from, not just the first source!
