export interface ApiConfig {
  provider: 'alchemy' | 'quicknode' | 'infura';
  apiKey: string;
  network: string;
  blockRangeLimit?: number; // Default 10 for free tier
}

export interface WalletLabel {
  address: string;
  label: string;
}

export interface TokenTransfer {
  from: string;
  to: string;
  value: string;
  tokenAddress: string;
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestamp: number;
  tokenTransfers: TokenTransfer[];
}

export interface TraceNode {
  address: string;
  label?: string;
  amount: string;
  transaction: string;
  timestamp: number;
  blockNumber: number;
  source?: TraceNode;
  sources?: TraceNode[]; // Multiple sources for wallets that received from multiple addresses
  isOrigin: boolean;
  originType?: 'dex' | 'contract' | 'aggregator' | 'cex' | 'unknown';
}

export interface AnalysisResult {
  poolAddress: string;
  tokenAddress: string;
  startTime: number;
  endTime: number;
  transactions: DexTransaction[];
  traces: TraceNode[];
  statistics: {
    totalBuys: number;
    totalSells: number;
    uniqueWallets: number;
    tracedToOrigin: number;
  };
}

export interface DexTransaction {
  type: 'buy' | 'sell';
  wallet: string;
  amount: string;
  timestamp: number;
  blockNumber: number;
  hash: string;
}
