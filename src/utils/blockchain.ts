import { ethers } from 'ethers';
import { Alchemy, Network, AssetTransfersCategory, SortingOrder } from 'alchemy-sdk';
import { ApiConfig, TokenTransfer, Transaction } from '../types';

const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export class BlockchainService {
  public provider: ethers.JsonRpcProvider;
  private config: ApiConfig;
  private blockRangeLimit: number;
  private logCallback?: (message: string) => void;
  private alchemy?: Alchemy;
  // Cache incoming transfers per (network, token, address)
  private incomingCache: Map<string, { transfers: TokenTransfer[]; maxBlock: number } > = new Map();

  // Normalize a decimal string that may be in scientific notation to a plain decimal string
  private normalizeDecimalString(value: string): string {
    const v = value.trim();
    if (!/[eE]/.test(v)) return v;
    const sign = v.startsWith('-') ? '-' : '';
    const [coeffRaw, expRaw] = v.replace(/^[-+]/, '').split(/[eE]/);
    const exp = parseInt(expRaw || '0', 10);
    const [intPart, fracPart = ''] = coeffRaw.split('.');
    const digits = (intPart + fracPart).replace(/^0+/, '') || '0';
    const fracLen = fracPart.length;
    // Move decimal point by exp
    if (exp >= 0) {
      const zerosNeeded = Math.max(0, exp - fracLen);
      const moved = digits + '0'.repeat(zerosNeeded);
      const cut = digits.length + exp - fracLen;
      const left = moved.slice(0, cut) || '0';
      const right = moved.slice(cut);
      return sign + (right ? `${left}.${right}` : left);
    } else {
      // Negative exponent: shift left
      const shift = fracLen + exp; // exp is negative
      if (shift > 0) {
        const left = digits.slice(0, shift) || '0';
        const right = digits.slice(shift);
        return sign + `${left}.${right}`.replace(/^(-?)0+(?=\d)/, '$1');
      } else {
        // Need to add leading zeros
        const zeros = '0'.repeat(Math.abs(shift));
        return sign + `0.${zeros}${digits}`.replace(/\.?0+$/, '');
      }
    }
  }

  constructor(config: ApiConfig, blockRangeLimit: number = 10, logCallback?: (message: string) => void) {
    this.config = config;
    this.blockRangeLimit = blockRangeLimit;
    this.logCallback = logCallback;
    this.provider = this.createProvider();
    
    // Initialize Alchemy SDK if using Alchemy provider
    if (config.provider === 'alchemy') {
      try {
        this.alchemy = new Alchemy({
          apiKey: config.apiKey,
          network: this.mapNetworkToAlchemy(config.network),
        });
        this.log('Alchemy SDK initialized for fast transfers API');
      } catch (error) {
        this.log('Alchemy SDK not available, falling back to standard RPC');
      }
    }
  }

  private mapNetworkToAlchemy(network: string): Network {
    const networkMap: Record<string, Network> = {
      'eth-mainnet': Network.ETH_MAINNET,
      'eth-sepolia': Network.ETH_SEPOLIA,
      'polygon-mainnet': Network.MATIC_MAINNET,
      'arbitrum-mainnet': Network.ARB_MAINNET,
      'optimism-mainnet': Network.OPT_MAINNET,
      'base-mainnet': Network.BASE_MAINNET,
    };
    return networkMap[network] || Network.ETH_MAINNET;
  }

  private log(message: string) {
    if (this.logCallback) {
      this.logCallback(message);
    }
  }

  private createProvider(): ethers.JsonRpcProvider {
    const { provider, apiKey, network } = this.config;
    
    let url: string;
    switch (provider) {
      case 'alchemy':
        url = `https://${network}.g.alchemy.com/v2/${apiKey}`;
        break;
      case 'quicknode':
        url = apiKey; // QuickNode provides full URL
        break;
      case 'infura':
        url = `https://${network}.infura.io/v3/${apiKey}`;
        break;
      default:
        throw new Error('Unsupported provider');
    }

    return new ethers.JsonRpcProvider(url);
  }

  async getLatestBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  async getBlockByTimestamp(timestamp: number): Promise<number> {
    const latestBlock = await this.provider.getBlock('latest');
    if (!latestBlock) throw new Error('Could not fetch latest block');

    let low = 0;
    let high = latestBlock.number;
    let bestBlock = high;

    // Binary search for block closest to timestamp
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const block = await this.provider.getBlock(mid);
      
      if (!block) {
        high = mid - 1;
        continue;
      }

      if (block.timestamp === timestamp) {
        return mid;
      } else if (block.timestamp < timestamp) {
        low = mid + 1;
        bestBlock = mid;
      } else {
        high = mid - 1;
      }
    }

    return bestBlock;
  }

  async getTokenTransfers(
    tokenAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<TokenTransfer[]> {
    const transfers: TokenTransfer[] = [];
    
    // Split into smaller chunks to respect block limits
    const chunks = this.splitBlockRange(fromBlock, toBlock, this.blockRangeLimit);
    
    for (const [start, end] of chunks) {
      try {
        this.log(`API Call: eth_getLogs for blocks ${start}-${end} (${end - start + 1} blocks)`);
        const logs = await this.provider.getLogs({
          address: tokenAddress,
          topics: [ERC20_TRANSFER_TOPIC],
          fromBlock: start,
          toBlock: end,
        });
        this.log(`Received ${logs.length} transfer events (filtering zero-value)`);

        for (const log of logs) {
          const value = ethers.toBigInt(log.data);
          
          // Skip zero-value transactions (scam/spam transactions)
          if (value === 0n) {
            continue;
          }
          
          const block = await this.provider.getBlock(log.blockNumber);
          transfers.push({
            from: ethers.getAddress('0x' + log.topics[1].slice(26)),
            to: ethers.getAddress('0x' + log.topics[2].slice(26)),
            value: value.toString(),
            tokenAddress: log.address,
            blockNumber: log.blockNumber,
            timestamp: block?.timestamp || 0,
            transactionHash: log.transactionHash,
          });
        }
      } catch (error: any) {
        // If we hit block range limit, retry with smaller range
        if (error.code === 'UNKNOWN_ERROR' && error.error?.message?.includes('block range')) {
          console.warn(`Block range too large, retrying with smaller chunks...`);
          // Recursively split this chunk in half
          const mid = Math.floor((start + end) / 2);
          if (mid > start) {
            const firstHalf = await this.getTokenTransfers(tokenAddress, start, mid);
            const secondHalf = await this.getTokenTransfers(tokenAddress, mid + 1, end);
            transfers.push(...firstHalf, ...secondHalf);
          }
        } else {
          throw error;
        }
      }
    }

    return transfers;
  }

  async getTransactionsForAddress(
    address: string,
    tokenAddress: string,
    fromBlock: number,
    toBlock: number,
    limit?: number
  ): Promise<TokenTransfer[]> {
    // Use Alchemy's fast API if available
    if (this.alchemy) {
      return await this.getTransactionsForAddressAlchemy(address, tokenAddress, fromBlock, toBlock, limit);
    }
    
    // Fallback to standard RPC
    return await this.getTransactionsForAddressRPC(address, tokenAddress, fromBlock, toBlock);
  }

  private async getTransactionsForAddressAlchemy(
    address: string,
    tokenAddress: string,
    fromBlock: number,
    toBlock: number,
    limit?: number
  ): Promise<TokenTransfer[]> {
    try {
      // If a limit is specified, fetch most recent first and stop early (no cache needed)
      if (typeof limit === 'number' && Number.isFinite(limit)) {
        const result: TokenTransfer[] = [];
        let pageKey: string | undefined = undefined;
        let fetchedCount = 0;
        do {
          const response: any = await this.alchemy!.core.getAssetTransfers({
            toAddress: address,
            contractAddresses: [tokenAddress],
            category: [AssetTransfersCategory.ERC20],
            // search full history but capped by toBlock, newest first
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: `0x${toBlock.toString(16)}`,
            maxCount: Math.min(1000, Math.max(1, limit - result.length)),
            order: SortingOrder.DESCENDING,
            pageKey,
          } as any);

          fetchedCount += response.transfers.length;
          this.log(`Alchemy API page (DESC) fetched ${response.transfers.length} transfers (total so far: ${fetchedCount})`);

          for (const transfer of response.transfers) {
            const decimals = parseInt(transfer.rawContract.decimal || '0x12', 16);
            const valueStr = this.normalizeDecimalString(String(transfer.value ?? '0'));
            const rawValue = ethers.parseUnits(valueStr, decimals);
            if (rawValue === 0n) continue;
            const blockNum = parseInt(transfer.blockNum, 16);
            if (blockNum > toBlock || blockNum < fromBlock) continue;
            const block = await this.provider.getBlock(blockNum);
            const timestamp = block?.timestamp || 0;
            result.push({
              from: transfer.from,
              to: transfer.to || address,
              value: rawValue.toString(),
              tokenAddress: transfer.rawContract.address || tokenAddress,
              blockNumber: blockNum,
              timestamp,
              transactionHash: transfer.hash,
            });
            if (result.length >= limit) break;
          }

          if (result.length >= limit) break;
          pageKey = response.pageKey;
        } while (pageKey);

        // We fetched newest first; return in ascending order for UI consistency
        return result.sort((a, b) => a.blockNumber - b.blockNumber);
      }

      const cacheKey = `${this.config.network}:${tokenAddress.toLowerCase()}:${address.toLowerCase()}`;
      const cached = this.incomingCache.get(cacheKey);
      const result: TokenTransfer[] = [];

      // If we have cached data up to a certain block, use it and only fetch beyond it
      let fetchFromBlock = 0;
      if (cached) {
        if (cached.maxBlock >= toBlock) {
          const filtered = cached.transfers.filter(t => t.blockNumber <= toBlock);
          this.log(`Cache hit for ${address.slice(0, 10)}..., returning ${filtered.length} transfers (<= block ${toBlock})`);
          return filtered;
        }
        fetchFromBlock = cached.maxBlock + 1;
        result.push(...cached.transfers);
        this.log(`Cache partial hit; fetching additional transfers from block ${fetchFromBlock} to ${toBlock}`);
      }

      // Paginated fetch from either 0 or last cached maxBlock+1 up to toBlock
      let pageKey: string | undefined = undefined;
      let fetchedCount = 0;
      do {
        const response: any = await this.alchemy!.core.getAssetTransfers({
          toAddress: address,
          contractAddresses: [tokenAddress],
          category: [AssetTransfersCategory.ERC20],
          fromBlock: `0x${(fetchFromBlock).toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          maxCount: 1000,
          order: SortingOrder.ASCENDING,
          pageKey,
        } as any);

        fetchedCount += response.transfers.length;
        this.log(`Alchemy API page fetched ${response.transfers.length} transfers (total so far: ${fetchedCount})`);

        for (const transfer of response.transfers) {
          const decimals = parseInt(transfer.rawContract.decimal || '0x12', 16); // Default 18
          const valueStr = this.normalizeDecimalString(String(transfer.value ?? '0'));
          const rawValue = ethers.parseUnits(valueStr, decimals);
          if (rawValue === 0n) continue;

          const blockNum = parseInt(transfer.blockNum, 16);
          const block = await this.provider.getBlock(blockNum);
          const timestamp = block?.timestamp || 0;

          result.push({
            from: transfer.from,
            to: transfer.to || address,
            value: rawValue.toString(),
            tokenAddress: transfer.rawContract.address || tokenAddress,
            blockNumber: blockNum,
            timestamp,
            transactionHash: transfer.hash,
          });
        }

        pageKey = response.pageKey;
      } while (pageKey);

      if (result.length === 0) {
        this.log(`⚠️ No transfers found for ${address.slice(0, 10)}... - wallet may have never received this token`);
      }

      // Merge into cache, de-duplicate by (hash, blockNumber, from, to, value)
      const dedupeKey = (t: TokenTransfer) => `${t.transactionHash}:${t.blockNumber}:${t.from}:${t.to}:${t.value}`;
      const merged = new Map<string, TokenTransfer>();
      for (const t of result) merged.set(dedupeKey(t), t);
      const finalList = Array.from(merged.values()).sort((a, b) => a.blockNumber - b.blockNumber);
      const newMax = finalList.length ? Math.max(...finalList.map(t => t.blockNumber)) : (cached?.maxBlock ?? 0);
      this.incomingCache.set(cacheKey, { transfers: finalList, maxBlock: Math.max(newMax, cached?.maxBlock ?? 0) });

      return finalList.filter(t => t.blockNumber <= toBlock);
    } catch (error) {
      this.log(`❌ Alchemy API failed: ${error}`);
      this.log(`Falling back to standard RPC method...`);
      return await this.getTransactionsForAddressRPC(address, tokenAddress, fromBlock, toBlock);
    }
  }

  private async getTransactionsForAddressRPC(
    address: string,
    tokenAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<TokenTransfer[]> {
    const transfers: TokenTransfer[] = [];
    const chunks = this.splitBlockRange(fromBlock, toBlock, this.blockRangeLimit);

    for (const [start, end] of chunks) {
      try {
        // Get transfers TO this address
        const incomingLogs = await this.provider.getLogs({
          address: tokenAddress,
          topics: [
            ERC20_TRANSFER_TOPIC,
            null,
            ethers.zeroPadValue(address, 32),
          ],
          fromBlock: start,
          toBlock: end,
        });

        for (const log of incomingLogs) {
          const value = ethers.toBigInt(log.data);
          
          // Skip zero-value transactions (scam/spam transactions)
          if (value === 0n) {
            continue;
          }
          
          const block = await this.provider.getBlock(log.blockNumber);
          transfers.push({
            from: ethers.getAddress('0x' + log.topics[1].slice(26)),
            to: ethers.getAddress('0x' + log.topics[2].slice(26)),
            value: value.toString(),
            tokenAddress: log.address,
            blockNumber: log.blockNumber,
            timestamp: block?.timestamp || 0,
            transactionHash: log.transactionHash,
          });
        }
      } catch (error: any) {
        // If we hit block range limit, retry with smaller range
        if (error.code === 'UNKNOWN_ERROR' && error.error?.message?.includes('block range')) {
          console.warn(`Block range too large, retrying with smaller chunks...`);
          const mid = Math.floor((start + end) / 2);
          if (mid > start) {
            const firstHalf = await this.getTransactionsForAddressRPC(address, tokenAddress, start, mid);
            const secondHalf = await this.getTransactionsForAddressRPC(address, tokenAddress, mid + 1, end);
            transfers.push(...firstHalf, ...secondHalf);
          }
        } else {
          throw error;
        }
      }
    }

    return transfers;
  }

  async getTransaction(hash: string): Promise<ethers.TransactionResponse | null> {
    return await this.provider.getTransaction(hash);
  }

  async getTransactionReceipt(hash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(hash);
  }

  private splitBlockRange(from: number, to: number, chunkSize: number): [number, number][] {
    const chunks: [number, number][] = [];
    let current = from;

    while (current <= to) {
      const end = Math.min(current + chunkSize - 1, to);
      chunks.push([current, end]);
      current = end + 1;
    }

    return chunks;
  }

  async getPoolTransactions(
    poolAddress: string,
    tokenAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<Transaction[]> {
    const transfers = await this.getTokenTransfers(tokenAddress, fromBlock, toBlock);
    
    // Filter transfers involving the pool
    const poolTransfers = transfers.filter(
      (t) =>
        t.from.toLowerCase() === poolAddress.toLowerCase() ||
        t.to.toLowerCase() === poolAddress.toLowerCase()
    );

    // Group by transaction hash
    const txMap = new Map<string, TokenTransfer[]>();
    for (const transfer of poolTransfers) {
      const existing = txMap.get(transfer.transactionHash) || [];
      existing.push(transfer);
      txMap.set(transfer.transactionHash, existing);
    }

    // Convert to Transaction objects
    const transactions: Transaction[] = [];
    for (const [hash, txTransfers] of txMap.entries()) {
      const tx = await this.getTransaction(hash);
      if (tx) {
        transactions.push({
          hash,
          from: tx.from,
          to: tx.to || '',
          value: tx.value.toString(),
          blockNumber: tx.blockNumber || 0,
          timestamp: txTransfers[0].timestamp,
          tokenTransfers: txTransfers,
        });
      }
    }

    return transactions;
  }
}
