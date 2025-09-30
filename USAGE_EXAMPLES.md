# Usage Examples

## Example 1: Analyzing FULA Token on Base

Let's trace the FULA token transactions from the example you provided.

### Step 1: Get the Addresses

From DexScreener URL: `https://dexscreener.com/base/0xdea9b8eb61349f0c5a378f448a61836c62c6afb3`

- **Pool Address**: `0xdea9b8eb61349f0c5a378f448a61836c62c6afb3`
- **Token Address**: You'll need to find this on DexScreener (usually shown in the token info)

### Step 2: Configure API

1. Get a free Alchemy API key for Base network
2. Click Settings ⚙️
3. Select "Alchemy"
4. Enter your API key
5. Select "base-mainnet"
6. Save

### Step 3: Set Timeframe

For a 24-hour analysis:
- **Start**: 2025-09-29 00:00
- **End**: 2025-09-30 00:00

### Step 4: Run Analysis

The app will:
1. Fetch all transactions in that 24-hour period
2. Identify buys (pool → wallet) and sells (wallet → pool)
3. For each sell, trace backwards to find token origin
4. Display the complete trace chain

### Expected Results

You might see traces like:

```
Wallet A (Seller)
  ↓ received from
Wallet B
  ↓ received from
DEX Pool (Origin: bought tokens)
```

Or:

```
Wallet A (Seller)
  ↓ received from
Token Contract (Origin: minted/airdrop)
```

## Example 2: Tracking Airdrop Recipients

### Scenario
You want to see if airdrop recipients are selling.

### Setup
1. Label the token contract address as "Token Contract"
2. Set timeframe to when airdrop happened
3. Run analysis

### What to Look For
Traces that show:
```
Seller Wallet
  ↓ received from
Token Contract (Origin: airdrop)
```

This indicates direct airdrop recipients selling.

## Example 3: Identifying Bot Activity

### Scenario
Find wallets that received tokens from aggregators (potential bots).

### Setup
1. Label known aggregator addresses:
   - `0x1111111254fb6c44bac0bed2854e76f90643097d` → "1inch v4"
   - `0xdef1c0ded9bec7f1a1670819833240f027b25eff` → "0x Protocol"

2. Run analysis on recent timeframe

### What to Look For
Multiple traces showing:
```
Seller Wallet
  ↓ received from
1inch v4 (Origin: aggregator)
```

High frequency of aggregator origins may indicate bot trading.

## Example 4: CEX Deposit Tracking

### Scenario
Track if tokens are being sent to centralized exchanges.

### Setup
1. Label known CEX deposit addresses:
   - `0x...` → "Binance Hot Wallet"
   - `0x...` → "Coinbase Deposit"

2. Run analysis

### What to Look For
Traces ending at CEX wallets indicate tokens moving to exchanges (potential sell pressure).

## Example 5: Team Wallet Monitoring

### Scenario
Monitor if team wallets are selling.

### Setup
1. Label team wallets:
   - `0x...` → "Team Wallet 1"
   - `0x...` → "Team Wallet 2"

2. Run regular analyses

### What to Look For
```
Seller Wallet
  ↓ received from
Team Wallet 1 (Origin: labeled)
```

This shows team members or recipients selling.

## Understanding Complex Traces

### Multi-Hop Transfers

Some traces go through multiple wallets:

```
Final Seller
  ↓ received from
Intermediate Wallet 1
  ↓ received from
Intermediate Wallet 2
  ↓ received from
DEX Pool (Origin)
```

This shows the token changed hands multiple times before being sold.

### Mixed Origins

In a single analysis, you might see:
- 40% from DEX Pool (bought and sold)
- 30% from Token Contract (airdrop recipients)
- 20% from Aggregators (bot activity)
- 10% from Unknown

This gives you a complete picture of selling pressure sources.

## Advanced Analysis Techniques

### 1. Time-Based Patterns

Run multiple analyses for different time periods:
- Morning: 6 AM - 12 PM
- Afternoon: 12 PM - 6 PM
- Evening: 6 PM - 12 AM
- Night: 12 AM - 6 AM

Compare origin patterns to find when different types of sellers are active.

### 2. Volume Analysis

Look at the amounts in traces:
- Large amounts from DEX Pool = whales buying and selling
- Small amounts from Contract = airdrop farmers
- Medium amounts from Aggregators = automated trading

### 3. Wallet Clustering

If you see multiple traces from the same intermediate wallet, that wallet might be:
- A distributor
- A whale splitting positions
- A bot operator

Label it for future reference.

### 4. Origin Distribution

Calculate percentages:
```
Statistics:
- DEX Origin: 45% (organic buyers)
- Contract Origin: 30% (airdrop)
- Aggregator Origin: 15% (bots)
- CEX Origin: 5% (exchange users)
- Unknown: 5%
```

This tells you the composition of your sellers.

## Tips for Effective Analysis

### 1. Start Small
- Begin with 1-2 hour timeframes
- Verify results make sense
- Expand to longer periods

### 2. Label Proactively
- Label wallets as you discover them
- Use descriptive names
- Include wallet type (CEX, DEX, Team, etc.)

### 3. Cross-Reference
- Check transactions on Etherscan
- Verify origins make sense
- Look for patterns

### 4. Regular Monitoring
- Run daily analyses
- Track changes in origin patterns
- Identify new large holders

### 5. Combine with Other Tools
- Use DexScreener for price action
- Use Etherscan for detailed tx info
- Use this tool for origin tracking

## Common Patterns

### Pattern 1: Airdrop Dump
```
High sell volume → Most traces to Token Contract
```
**Meaning**: Airdrop recipients are selling

### Pattern 2: Whale Rotation
```
Large amounts → Traces to DEX Pool → Recent purchase
```
**Meaning**: Whales buying and quickly selling

### Pattern 3: Bot Activity
```
Many small sells → Traces to Aggregators
```
**Meaning**: Automated trading activity

### Pattern 4: Organic Growth
```
Varied amounts → Mixed origins → Long hold times
```
**Meaning**: Healthy, diverse holder base

### Pattern 5: Coordinated Dump
```
Multiple sells → Same intermediate wallet → Contract origin
```
**Meaning**: Coordinated selling, possibly from team distribution

## Limitations to Keep in Mind

1. **Trace Depth**: Limited to 50 hops to prevent infinite loops
2. **Block Limits**: RPC providers limit queries to ~2000 blocks
3. **Complex DeFi**: Some DeFi interactions may not trace correctly
4. **Privacy**: Can't trace through privacy protocols
5. **Time**: Large timeframes take longer to analyze

## Best Practices

1. **API Management**
   - Use free tier for testing
   - Upgrade for production use
   - Monitor rate limits

2. **Data Interpretation**
   - Don't rely on single analysis
   - Look for trends over time
   - Cross-reference with other data

3. **Wallet Labeling**
   - Be consistent with naming
   - Update labels as you learn more
   - Share labels with team

4. **Performance**
   - Shorter timeframes = faster results
   - Label known origins to speed up tracing
   - Use appropriate network (Base is faster/cheaper)

## Troubleshooting Common Issues

### Issue: No transactions found
**Solution**: 
- Verify pool address is correct
- Check timeframe has activity
- Ensure correct network selected

### Issue: Traces not reaching origin
**Solution**:
- Wallet history is very long
- Label known origin wallets
- Accept that some traces won't complete

### Issue: Slow performance
**Solution**:
- Reduce timeframe
- Upgrade API plan
- Use faster network (Base, Arbitrum)

### Issue: Incorrect origin detection
**Solution**:
- Manually label the wallet
- Check if it's a new aggregator/DEX
- Report issue for future updates
