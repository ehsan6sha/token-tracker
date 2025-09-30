# Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get an API Key

Choose one of these providers and sign up for a free API key:

- **Alchemy** (Recommended): https://www.alchemy.com/
  - Sign up and create a new app
  - Select your network (e.g., Base Mainnet)
  - Copy your API key

- **Infura**: https://www.infura.io/
  - Create a new project
  - Copy your project ID

- **QuickNode**: https://www.quicknode.com/
  - Create an endpoint
  - Copy the full endpoint URL

## Step 3: Run the Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Step 4: Configure the App

1. Click the **Settings** icon (⚙️) in the top right
2. Select your provider
3. Enter your API key
4. Select your network (e.g., base-mainnet for Base chain)
5. Click **Save**

## Step 5: Add Wallet Labels (Optional)

1. Click the **Tag** icon (🏷️) in the top right
2. Add known wallet addresses with labels
3. Examples:
   - `0x...` → "Binance Hot Wallet"
   - `0x...` → "Team Wallet"
   - `0x...` → "1inch Router"

## Step 6: Analyze a Token

1. Go to DexScreener and find your token
   - Example: https://dexscreener.com/base/0xdea9b8eb61349f0c5a378f448a61836c62c6afb3

2. Copy the pool address from the URL or enter it directly

3. Find the token contract address (usually shown on DexScreener)

4. Select the timeframe (Past 1 hour, 8 hours, or 24 hours)

5. Click **Start Analysis**

## Example Analysis

**Pool Address**: `0xdea9b8eb61349f0c5a378f448a61836c62c6afb3`
**Token Address**: `0x...` (the actual token contract)
**Timeframe**: Past 24 hours

The app will:
1. Fetch all buy/sell transactions in that timeframe
2. For each sell, trace the wallet back to find where they got the tokens
3. Continue tracing until reaching "time 0" (origin point)
4. Display the full trace chain for each transaction

## Understanding Results

### Statistics
- **Total Buys/Sells**: Number of transactions
- **Unique Wallets**: Number of different addresses
- **Traced to Origin**: How many traces reached a definitive origin

### Origin Types
- 🔵 **DEX Pool**: Tokens came from the liquidity pool (bought)
- 🟣 **Token Contract**: Tokens came directly from the contract (minted/airdrop)
- 🟠 **Aggregator**: Tokens came from 1inch, 0x, or similar
- 🟢 **CEX**: Tokens came from a centralized exchange
- ⚪ **Unknown**: Origin couldn't be determined

## Tips

- Start with "Past 1 hour" to test quickly
- Label important wallets before analyzing
- Use Base network for faster/cheaper queries
- Check your API provider's rate limits
- The app automatically filters out zero-value spam transactions
- Configure block range limit based on your API tier (default: 10 blocks for free tier)

## Troubleshooting

**"Invalid address format"**
- Make sure addresses start with 0x and are 42 characters long

**"Could not fetch transactions"**
- Check your API key is correct
- Verify you selected the right network
- Check your API provider's rate limits

**Slow performance**
- Reduce the timeframe
- Use a provider with higher rate limits
- Consider upgrading your API plan

**Traces not reaching origin**
- Some wallets have very long histories
- The app limits trace depth to 50 levels
- Label known origin wallets to help the algorithm
