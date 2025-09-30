# Changelog

## Version 2.0.0 - 2025-09-30

### 🚀 Major Change: Single Transaction Analysis

**Breaking Change**: Completely redesigned the analysis approach for better performance and usability.

#### Changed
- **From Timeframe to Transaction**: Replaced timeframe-based analysis with single transaction analysis
  - **Before**: Analyze all transactions in past 1/8/24 hours (could be hundreds of transactions)
  - **After**: Analyze one specific sell transaction by its hash
  
- **Simplified Input**: 
  - Removed: Pool address, timeframe selector
  - Added: Transaction hash input
  - Kept: Token address

#### Why This Change?
- **Performance**: Timeframe analysis was too slow with many transactions
- **Efficiency**: Single transaction analysis is much faster
- **Precision**: Users can target specific sells they want to investigate
- **Scalability**: Works with any blockchain without overwhelming API limits

#### How It Works Now
1. User provides a transaction hash (e.g., from Etherscan)
2. App fetches the transaction and identifies the seller (tx.from)
3. App analyzes token transfers to find amount sold
4. App traces seller's wallet back to origin (time 0)
5. Results show complete trace chain

#### Example
```
Input:
- TX: 0x0e1b8789d9eee8f8adec001aa7d696073f3735f4cba688f8027d4529aa500026
- Token: 0x...

Output:
- Seller: 0x1234...5678
- Amount: 1000 tokens
- Trace: Seller → Wallet A → Wallet B → DEX Pool (origin)
```

## Version 1.2.0 - 2025-09-30

### Added
- **Detailed Progress Logging**: Expandable details section showing real-time analysis progress
  - Shows current step and detailed information
  - Displays API calls being made
  - Timestamps for each operation
  - Color-coded by status (info, success, warning)
  - Collapsed by default, expandable on click
  - Scrollable log viewer for long operations

### Changed
- **Simplified Timeframe Selection**: Replaced custom date/time inputs with a dropdown selector
  - Past 1 hour
  - Past 8 hours
  - Past 24 hours
  
### Added
- **Zero-Value Transaction Filtering**: Automatically filters out zero-value token transfers
  - Prevents scam/spam transactions from polluting analysis results
  - Applied to all token transfer queries
  
- **Configurable Block Range Limit**: Added UI option to configure block range based on API tier
  - Free Tier: 10 blocks (default)
  - Growth Tier: 100 blocks
  - Pro Tier: 2000 blocks
  
- **Automatic Block Range Retry**: If a query exceeds block limits, automatically retries with smaller chunks
  - Recursive splitting ensures queries succeed even on free tier
  - Transparent to user with progress tracking

### Fixed
- **Free Tier Compatibility**: Fixed error when using Alchemy/Infura free tier (10 block limit)
- **Block Range Error Handling**: Improved error handling for block range limit errors

### Technical Details

#### Zero-Value Filtering
```typescript
// Skip zero-value transactions (scam/spam transactions)
if (value === 0n) {
  continue;
}
```

Applied in:
- `getTokenTransfers()` - Pool transaction analysis
- `getTransactionsForAddress()` - Wallet history tracing

#### Dynamic Block Range
```typescript
constructor(config: ApiConfig, blockRangeLimit: number = 10) {
  this.blockRangeLimit = blockRangeLimit;
}
```

#### Automatic Retry Logic
```typescript
catch (error: any) {
  if (error.code === 'UNKNOWN_ERROR' && error.error?.message?.includes('block range')) {
    // Recursively split this chunk in half
    const mid = Math.floor((start + end) / 2);
    if (mid > start) {
      const firstHalf = await this.getTokenTransfers(tokenAddress, start, mid);
      const secondHalf = await this.getTokenTransfers(tokenAddress, mid + 1, end);
      transfers.push(...firstHalf, ...secondHalf);
    }
  }
}
```

## Version 1.0.0 - 2025-09-30

### Initial Release
- Token origin tracking from DEX pools
- Support for Alchemy, QuickNode, and Infura
- Wallet labeling system
- Recursive token tracing to time 0
- Origin detection (DEX, Contract, Aggregator, CEX)
- Responsive UI with dark theme
- GitHub Pages deployment ready
