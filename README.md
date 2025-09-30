# Token Origin Tracker

A Web3 portal for tracing token origins from individual sell transactions. This tool analyzes a specific transaction to identify the seller and traces their tokens back to the original source (time 0).

## Features

- 🔍 **Single Transaction Analysis**: Analyze any sell transaction by its hash
- 🔗 **Origin Tracing**: Trace tokens back to their source (DEX pool, token contract, aggregator, or CEX)
- 🛡️ **Spam Protection**: Automatically filters out zero-value transactions (common scam technique)
- 📊 **Detailed Progress Logging**: Expandable real-time view of analysis steps and API calls
- 🏷️ **Wallet Labels**: Label known wallets for easier identification
- 🔌 **Multiple Providers**: Support for Alchemy, QuickNode, and Infura APIs
- ⚡ **Alchemy Optimization**: 600x faster tracing with Alchemy's indexed API (like Basescan)
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 💾 **Browser Storage**: All configuration stored locally in your browser
- 🚀 **Efficient**: Analyzes one transaction at a time, avoiding large timeframe queries

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- An API key from one of the supported providers:
  - [Alchemy](https://www.alchemy.com/)
  - [QuickNode](https://www.quicknode.com/)
  - [Infura](https://www.infura.io/)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sales-tracker.git
cd sales-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment to GitHub Pages

1. Update the `base` property in `vite.config.ts` to match your repository name:
```typescript
base: '/your-repo-name/',
```

2. Push your code to GitHub

3. Enable GitHub Pages in your repository settings:
   - Go to Settings > Pages
   - Select "GitHub Actions" as the source

4. The site will automatically deploy on every push to the main branch

## Usage

1. **Configure API Access**: On first launch, enter your blockchain API provider credentials

2. **Add Wallet Labels** (Optional): Label known wallets for easier identification in traces

3. **Start Analysis**:
   - Enter the transaction hash of a sell transaction (e.g., from Etherscan or DexScreener)
   - Enter the token contract address being sold
   - Click "Start Analysis"

4. **View Results**:
   - See who the seller is (the "From" address in the transaction)
   - View the complete trace chain showing where they got the tokens
   - Expand trace details to see each hop back to the origin

## How It Works

1. **Transaction Analysis**: Fetches the specific transaction and analyzes token transfers
2. **Seller Identification**: Identifies the wallet that initiated the sell (tx.from)
3. **Amount Detection**: Determines how many tokens were sold
4. **Origin Tracing**: Traces the seller's wallet backwards to find where they got the tokens
5. **Recursive Tracing**: Continues tracing through each intermediate wallet
6. **Time 0 Detection**: Identifies when tokens entered circulation (from DEX, contract, aggregator, or CEX)

## Technical Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Ethers.js** - Blockchain interaction
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Limitations

- **Block range limits**: Free tier providers (Alchemy, Infura) limit queries to 10 blocks. The app automatically handles this by splitting queries and retrying with smaller ranges if needed.
- **Rate limits**: Depend on your API provider plan
- **Tracing depth**: Limited to 50 levels to prevent infinite loops
- **Complex DeFi**: Some complex DeFi interactions may not be fully traced

### Block Range Tiers

- **Free Tier**: 10 blocks per query (default)
- **Growth Tier**: 100 blocks per query
- **Pro Tier**: 2000 blocks per query

Configure your tier in the API settings based on your provider plan.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for any purpose.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
