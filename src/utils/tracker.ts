import { BlockchainService } from './blockchain';
import { TraceNode, TokenTransfer, DexTransaction } from '../types';
import { storageUtils } from './storage';

const KNOWN_AGGREGATORS = [
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch v4
  '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch v5
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap Universal Router
];

const KNOWN_CEX_PATTERNS = ['binance', 'coinbase', 'kraken', 'okx', 'bybit'];

export class TokenTracker {
  private blockchain: BlockchainService;
  private poolAddress: string;
  private tokenAddress: string;
  private processedAddresses: Set<string> = new Set();
  private maxDepth = 50; // Prevent infinite loops
  private logCallback?: (message: string) => void;

  constructor(
    blockchain: BlockchainService,
    poolAddress: string,
    tokenAddress: string,
    logCallback?: (message: string) => void
  ) {
    this.blockchain = blockchain;
    this.poolAddress = poolAddress.toLowerCase();
    this.tokenAddress = tokenAddress.toLowerCase();
    this.logCallback = logCallback;
  }

  private log(message: string) {
    if (this.logCallback) {
      this.logCallback(message);
    }
  }

  async analyzeDexTransactions(
    fromBlock: number,
    toBlock: number
  ): Promise<DexTransaction[]> {
    const transactions = await this.blockchain.getPoolTransactions(
      this.poolAddress,
      this.tokenAddress,
      fromBlock,
      toBlock
    );

    const dexTransactions: DexTransaction[] = [];

    for (const tx of transactions) {
      // Analyze token transfers to determine buy/sell
      for (const transfer of tx.tokenTransfers) {
        const isFromPool = transfer.from.toLowerCase() === this.poolAddress;
        const isToPool = transfer.to.toLowerCase() === this.poolAddress;

        if (isFromPool && !isToPool) {
          // Pool sending tokens = someone buying
          dexTransactions.push({
            type: 'buy',
            wallet: transfer.to,
            amount: transfer.value,
            timestamp: transfer.timestamp,
            blockNumber: transfer.blockNumber,
            hash: transfer.transactionHash,
          });
        } else if (isToPool && !isFromPool) {
          // Pool receiving tokens = someone selling
          dexTransactions.push({
            type: 'sell',
            wallet: transfer.from,
            amount: transfer.value,
            timestamp: transfer.timestamp,
            blockNumber: transfer.blockNumber,
            hash: transfer.transactionHash,
          });
        }
      }
    }

    return dexTransactions;
  }

  async traceToOrigin(
    walletAddress: string,
    amount: string,
    initialBlock: number,
    transactionHash: string,
    depth: number = 0
  ): Promise<TraceNode> {
    const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    this.log(`[Depth ${depth}] Tracing wallet ${shortAddr} at block ${initialBlock}`);
    
    const node: TraceNode = {
      address: walletAddress.toLowerCase(),
      label: storageUtils.getWalletLabel(walletAddress),
      amount,
      transaction: transactionHash,
      timestamp: 0,
      blockNumber: initialBlock,
      isOrigin: false,
    };

    // Check if this is already an origin point
    if (this.isOriginAddress(walletAddress)) {
      const originType = this.getOriginType(walletAddress);
      this.log(`[Depth ${depth}] ✓ Origin found: ${originType} (${shortAddr})`);
      node.isOrigin = true;
      node.originType = originType;
      return node;
    }

    // Prevent infinite loops
    if (this.processedAddresses.has(walletAddress.toLowerCase())) {
      this.log(`[Depth ${depth}] ⚠ Already processed ${shortAddr}, stopping trace`);
      node.isOrigin = true;
      node.originType = 'unknown';
      return node;
    }

    if (depth >= this.maxDepth) {
      this.log(`[Depth ${depth}] ⚠ Max depth reached for ${shortAddr}`);
      node.isOrigin = true;
      node.originType = 'unknown';
      return node;
    }

    this.processedAddresses.add(walletAddress.toLowerCase());

    try {
      // Find ALL incoming transfers to this wallet
      this.log(`[Depth ${depth}] Searching for ALL incoming transfers to ${shortAddr}...`);
      const allTransfers = await this.findAllIncomingTransfers(
        walletAddress,
        initialBlock,
        depth
      );

      if (allTransfers.length === 0) {
        // No incoming transfer found - this is origin
        this.log(`[Depth ${depth}] ⚠ No incoming transfers found for ${shortAddr}`);
        node.isOrigin = true;
        node.originType = 'unknown';
        return node;
      }

      // Update node with earliest transfer timestamp
      node.timestamp = Math.min(...allTransfers.map(t => t.timestamp));

      // Group transfers by sender
      const bySender = allTransfers.reduce((acc, t) => {
        const sender = t.from.toLowerCase();
        if (!acc[sender]) acc[sender] = [];
        acc[sender].push(t);
        return acc;
      }, {} as Record<string, TokenTransfer[]>);

      const senders = Object.keys(bySender);
      
      if (senders.length === 1) {
        // Single source - use original logic
        const firstTransfer = allTransfers[0];
        const sourceAddr = `${firstTransfer.from.slice(0, 6)}...${firstTransfer.from.slice(-4)}`;
        this.log(`[Depth ${depth}] Single source: ${sourceAddr} at block ${firstTransfer.blockNumber}`);

        // Check if source is an origin
        if (this.isOriginAddress(firstTransfer.from)) {
          const originType = this.getOriginType(firstTransfer.from);
          this.log(`[Depth ${depth}] ✓ Source is origin: ${originType} (${sourceAddr})`);
          node.source = {
            address: firstTransfer.from.toLowerCase(),
            label: storageUtils.getWalletLabel(firstTransfer.from),
            amount: firstTransfer.value,
            transaction: firstTransfer.transactionHash,
            timestamp: firstTransfer.timestamp,
            blockNumber: firstTransfer.blockNumber,
            isOrigin: true,
            originType: originType,
          };
          return node;
        }

        // Recursively trace the source
        this.log(`[Depth ${depth}] → Recursively tracing ${sourceAddr}...`);
        node.source = await this.traceToOrigin(
          firstTransfer.from,
          firstTransfer.value,
          firstTransfer.blockNumber,
          firstTransfer.transactionHash,
          depth + 1
        );
      } else {
        // Multiple sources - trace all of them
        this.log(`[Depth ${depth}] Multiple sources: ${senders.length} different addresses`);
        node.sources = [];

        for (const sender of senders) {
          const senderTransfers = bySender[sender];
          const totalFromSender = senderTransfers.reduce((sum, t) => sum + BigInt(t.value), 0n);
          const earliestTransfer = senderTransfers.reduce((earliest, current) =>
            current.blockNumber < earliest.blockNumber ? current : earliest
          );

          const sourceAddr = `${sender.slice(0, 6)}...${sender.slice(-4)}`;
          this.log(`[Depth ${depth}] Tracing source ${sourceAddr} (${senderTransfers.length} transfer(s), total: ${Number(totalFromSender) / 1e18} tokens)`);

          // Check if this source is an origin
          if (this.isOriginAddress(sender)) {
            const originType = this.getOriginType(sender);
            this.log(`[Depth ${depth}] ✓ Source is origin: ${originType} (${sourceAddr})`);
            node.sources.push({
              address: sender,
              label: storageUtils.getWalletLabel(sender),
              amount: totalFromSender.toString(),
              transaction: earliestTransfer.transactionHash,
              timestamp: earliestTransfer.timestamp,
              blockNumber: earliestTransfer.blockNumber,
              isOrigin: true,
              originType: originType,
            });
          } else {
            // Recursively trace this source
            this.log(`[Depth ${depth}] → Recursively tracing ${sourceAddr}...`);
            const sourceNode = await this.traceToOrigin(
              sender,
              totalFromSender.toString(),
              earliestTransfer.blockNumber,
              earliestTransfer.transactionHash,
              depth + 1
            );
            node.sources.push(sourceNode);
          }
        }
      }

      return node;
    } catch (error) {
      this.log(`[Depth ${depth}] ❌ Error tracing ${shortAddr}: ${error}`);
      console.error(`Error tracing ${walletAddress}:`, error);
      node.isOrigin = true;
      node.originType = 'unknown';
      return node;
    }
  }

  private async findAllIncomingTransfers(
    address: string,
    beforeBlock: number,
    depth: number
  ): Promise<TokenTransfer[]> {
    const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
    this.log(`  Searching for ALL incoming transfers to ${shortAddr} up to block ${beforeBlock} (depth ${depth})...`);
    
    // Depth-based cap selection (pre-fetch)
    let cap = Infinity;
    if (depth >= 1 && depth <= 4) cap = 4;
    else if (depth >= 5 && depth <= 8) cap = 2;
    else if (depth > 8) cap = 1;

    const fetchLimit = cap === Infinity ? undefined : cap;
    if (fetchLimit) {
      this.log(`  Applying fetch cap of ${fetchLimit} (most recent) due to depth ${depth}`);
    }

    // Use blockchain service to get transfers (limited at fetch when applicable)
    const transfers = await this.blockchain.getTransactionsForAddress(
      address,
      this.tokenAddress,
      0, // Search from genesis
      beforeBlock,
      fetchLimit
    );

    // Filter for incoming transfers only
    let incoming = transfers.filter(
      (t) => t.to.toLowerCase() === address.toLowerCase()
    );

    // Post-fetch safety cap (should be no-op when fetchLimit was applied)
    const totalIncoming = incoming.length;
    if (fetchLimit && totalIncoming > fetchLimit) {
      incoming = incoming
        .sort((a, b) => b.blockNumber - a.blockNumber)
        .slice(0, fetchLimit)
        .sort((a, b) => a.blockNumber - b.blockNumber);
      this.log(`  Safety cap applied after fetch: truncated to ${fetchLimit} for ${shortAddr} (depth ${depth})`);
    } else {
      this.log(`  Found ${incoming.length} incoming transfer(s) for ${shortAddr} (depth ${depth})`);
    }
    
    // Group by sender and log
    const bySender = incoming.reduce((acc, t) => {
      const sender = t.from.toLowerCase();
      if (!acc[sender]) acc[sender] = [];
      acc[sender].push(t);
      return acc;
    }, {} as Record<string, TokenTransfer[]>);
    
    Object.entries(bySender).forEach(([sender, txs]) => {
      const senderShort = `${sender.slice(0, 6)}...${sender.slice(-4)}`;
      this.log(`    From ${senderShort}: ${txs.length} transfer(s)`);
    });

    return incoming;
  }

  private isOriginAddress(address: string): boolean {
    const addr = address.toLowerCase();
    
    // Check if it's the pool itself
    if (addr === this.poolAddress) {
      return true;
    }

    // Check if it's the token contract
    if (addr === this.tokenAddress) {
      return true;
    }

    // Check if it's a known aggregator
    if (KNOWN_AGGREGATORS.some((agg) => agg.toLowerCase() === addr)) {
      return true;
    }

    // Check if it's a labeled CEX wallet
    const label = storageUtils.getWalletLabel(address);
    if (label && KNOWN_CEX_PATTERNS.some((pattern) => 
      label.toLowerCase().includes(pattern)
    )) {
      return true;
    }

    return false;
  }

  private getOriginType(address: string): 'dex' | 'contract' | 'aggregator' | 'cex' | 'unknown' {
    const addr = address.toLowerCase();

    if (addr === this.poolAddress) {
      return 'dex';
    }

    if (addr === this.tokenAddress) {
      return 'contract';
    }

    if (KNOWN_AGGREGATORS.some((agg) => agg.toLowerCase() === addr)) {
      return 'aggregator';
    }

    const label = storageUtils.getWalletLabel(address);
    if (label && KNOWN_CEX_PATTERNS.some((pattern) => 
      label.toLowerCase().includes(pattern)
    )) {
      return 'cex';
    }

    return 'unknown';
  }

  async analyzeAndTrace(
    fromBlock: number,
    toBlock: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ transactions: DexTransaction[]; traces: TraceNode[] }> {
    // Get all DEX transactions in the timeframe
    this.log(`Analyzing DEX transactions from block ${fromBlock} to ${toBlock}...`);
    const dexTransactions = await this.analyzeDexTransactions(fromBlock, toBlock);
    
    // Filter for sells only (as per requirement)
    const sells = dexTransactions.filter((tx) => tx.type === 'sell');
    this.log(`Found ${dexTransactions.length} total transactions (${sells.length} sells, ${dexTransactions.length - sells.length} buys)`);

    const traces: TraceNode[] = [];
    
    for (let i = 0; i < sells.length; i++) {
      const sell = sells[i];
      const sellAddr = `${sell.wallet.slice(0, 6)}...${sell.wallet.slice(-4)}`;
      
      this.log(`\n=== Tracing sell #${i + 1}/${sells.length}: ${sellAddr} ===`);
      
      if (onProgress) {
        onProgress(i + 1, sells.length);
      }

      // Reset processed addresses for each new trace
      this.processedAddresses.clear();

      const trace = await this.traceToOrigin(
        sell.wallet,
        sell.amount,
        sell.blockNumber,
        sell.hash
      );

      traces.push(trace);
      this.log(`=== Completed trace #${i + 1}/${sells.length} ===\n`);
    }

    return { transactions: dexTransactions, traces };
  }
}
