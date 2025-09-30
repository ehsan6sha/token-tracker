# Migration Guide: Version 2.0.0

## Major Change: Single Transaction Analysis

Version 2.0.0 introduces a fundamental change in how the application works, moving from timeframe-based analysis to single transaction analysis.

## What Changed?

### Before (v1.x)
```
Input:
- Pool Address: 0xdea9b8eb61349f0c5a378f448a61836c62c6afb3
- Token Address: 0x...
- Timeframe: Past 24 hours

Process:
1. Fetch all transactions in timeframe (could be 100+)
2. Identify buys and sells
3. Trace each sell to origin
4. Show all results

Problems:
- Too many transactions = slow
- API rate limits
- Large block ranges
- Overwhelming results
```

### After (v2.0)
```
Input:
- Transaction Hash: 0x0e1b8789d9eee8f8adec001aa7d696073f3735f4cba688f8027d4529aa500026
- Token Address: 0x...

Process:
1. Fetch single transaction
2. Identify seller from tx.from
3. Trace seller to origin
4. Show focused result

Benefits:
- Fast and efficient
- Precise targeting
- No rate limit issues
- Clear, focused results
```

## How to Use v2.0

### Step 1: Find a Transaction
Go to a block explorer (Etherscan, Basescan, etc.) or DexScreener and find a sell transaction you want to analyze.

**Example from DexScreener:**
1. Go to token page
2. Click on "Txns" tab
3. Find a sell transaction
4. Copy the transaction hash

**Example from Etherscan:**
1. Go to token page
2. Click on token transfers
3. Find a sell transaction
4. Copy the transaction hash

### Step 2: Enter Details
```
Transaction Hash: 0x0e1b8789d9eee8f8adec001aa7d696073f3735f4cba688f8027d4529aa500026
Token Address: 0x... (the token being sold)
```

### Step 3: Analyze
Click "Start Analysis" and watch the detailed logs to see:
- Who the seller is
- How much they sold
- Where they got the tokens
- Complete trace to origin

## Use Cases

### Use Case 1: Investigate Specific Sell
**Scenario**: You see a large sell on DexScreener and want to know if it's a whale, team member, or airdrop recipient.

**v1.x Approach**: 
- Analyze past 24 hours
- Get 100+ transactions
- Find the specific one
- Wait for all traces

**v2.0 Approach**:
- Copy the transaction hash
- Paste into app
- Get immediate trace for that specific sell

### Use Case 2: Track Team Wallets
**Scenario**: You suspect team members are selling.

**v1.x Approach**:
- Analyze timeframe
- Look through all sells
- Find team wallet addresses

**v2.0 Approach**:
- See suspicious sell on explorer
- Analyze that specific transaction
- Immediately see if it traces to team wallet

### Use Case 3: Airdrop Dumpers
**Scenario**: Check if sellers are airdrop recipients.

**v1.x Approach**:
- Analyze timeframe
- Get all sells
- Check each trace

**v2.0 Approach**:
- Pick a sell transaction
- Trace it
- See if it goes back to token contract (airdrop)

## API Considerations

### v1.x API Usage
```
Timeframe: 24 hours
Transactions: 100 sells
API Calls: 
- 1 call for block numbers
- 100+ calls for pool transactions
- 1000+ calls for tracing (10 per sell average)
Total: ~1100 API calls
```

### v2.0 API Usage
```
Single Transaction
API Calls:
- 1 call for transaction
- 1 call for receipt
- 10-50 calls for tracing (depending on depth)
Total: ~15 API calls average
```

**Result**: 70x fewer API calls!

## Breaking Changes

### Removed Features
- ❌ Pool address input
- ❌ Timeframe selector (1h, 8h, 24h)
- ❌ Bulk transaction analysis
- ❌ Buy transaction tracking

### Added Features
- ✅ Transaction hash input
- ✅ Direct seller identification
- ✅ Focused single-trace analysis
- ✅ Much faster performance

### Unchanged Features
- ✅ Token address input
- ✅ Origin tracing algorithm
- ✅ Wallet labeling
- ✅ Detailed progress logs
- ✅ API configuration
- ✅ Results visualization

## Technical Changes

### Code Changes
1. **AnalysisForm.tsx**
   - Removed: `poolAddress`, `timeframe` states
   - Added: `transactionHash` state
   - Rewrote: `handleSubmit` function

2. **TokenTracker.ts**
   - Pool address now optional (empty string)
   - Focus on single trace execution

3. **UI Components**
   - Updated form layout
   - New placeholder text
   - Helper text for inputs

## Backward Compatibility

**None** - This is a breaking change. v1.x saved analyses won't work with v2.0.

However:
- API configuration is preserved
- Wallet labels are preserved
- All settings are preserved

## Migration Checklist

- [x] Update input form (remove pool/timeframe, add tx hash)
- [x] Rewrite analysis logic for single transaction
- [x] Update documentation
- [x] Update README
- [x] Update CHANGELOG
- [x] Test with real transactions

## Example Workflow

### Old Workflow (v1.x)
```
1. Find token on DexScreener
2. Copy pool address from URL
3. Enter pool address
4. Select timeframe
5. Wait 2-5 minutes
6. Browse through 100+ results
7. Find the transaction you care about
```

### New Workflow (v2.0)
```
1. Find specific sell on DexScreener or Etherscan
2. Copy transaction hash
3. Enter transaction hash
4. Wait 10-30 seconds
5. See focused result immediately
```

## Performance Comparison

| Metric | v1.x (24h) | v2.0 (Single TX) |
|--------|-----------|------------------|
| API Calls | ~1100 | ~15 |
| Time | 2-5 min | 10-30 sec |
| Results | 100+ traces | 1 focused trace |
| Rate Limits | Often hit | Rarely hit |
| User Focus | Scattered | Precise |

## Conclusion

Version 2.0 is a complete redesign focused on efficiency and precision. Instead of analyzing everything in a timeframe, you now analyze exactly what you want to investigate.

This makes the tool:
- **Faster**: 10x speed improvement
- **Cheaper**: 70x fewer API calls
- **Clearer**: Focused results
- **Scalable**: Works on any chain

The trade-off is you need to identify transactions manually, but this is actually better for investigation workflows where you're looking at specific suspicious activity.
