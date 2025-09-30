import { useState } from 'react';
import { ApiConfig } from '../types';
import { BlockchainService } from '../utils/blockchain';
import { TokenTracker } from '../utils/tracker';
import { storageUtils } from '../utils/storage';
import { Search, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  apiConfig: ApiConfig;
  onAnalysisComplete: (result: any) => void;
}

interface ProgressLog {
  step: string;
  detail: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning';
}

export default function AnalysisForm({ apiConfig, onAnalysisComplete }: Props) {
  const [transactionHash, setTransactionHash] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const extractAddressFromUrl = (url: string): string => {
    // Extract from dexscreener URL: https://dexscreener.com/base/0x...
    const match = url.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : url;
  };

  const addLog = (step: string, detail: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setProgressLogs(prev => [...prev, { step, detail, timestamp: Date.now(), type }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setProgress({ current: 0, total: 0 });
    setProgressLogs([]);
    setShowDetails(false);

    try {
      addLog('Validating Input', 'Validating transaction hash and token address', 'info');
      const txHash = transactionHash.trim();
      const token = extractAddressFromUrl(tokenAddress.trim());

      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        throw new Error('Invalid transaction hash format (must be 66 characters: 0x + 64 hex)');
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
        throw new Error('Invalid token address format');
      }

      addLog('Initializing Blockchain Service', `Provider: ${apiConfig.provider}, Block Range: ${apiConfig.blockRangeLimit || 10}`, 'info');
      // Initialize blockchain service with block range limit and logging
      const blockchain = new BlockchainService(
        apiConfig, 
        apiConfig.blockRangeLimit || 10,
        (message) => addLog('Blockchain API', message, 'info')
      );

      // Fetch the transaction
      addLog('Fetching Transaction', `Getting transaction details for ${txHash.slice(0, 10)}...`, 'info');
      const tx = await blockchain.getTransaction(txHash);
      
      if (!tx) {
        throw new Error('Transaction not found');
      }

      if (!tx.blockNumber) {
        throw new Error('Transaction is pending or not mined yet');
      }

      addLog('Transaction Found', `Block: ${tx.blockNumber}, From: ${tx.from.slice(0, 10)}...`, 'success');

      // Get transaction receipt to analyze token transfers
      addLog('Fetching Receipt', `Getting transaction receipt to analyze token transfers`, 'info');
      const receipt = await blockchain.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      // Find token transfers in the transaction
      addLog('Analyzing Transfers', `Looking for token transfers in transaction`, 'info');
      const tokenTransfers = receipt.logs
        .filter(log => 
          log.address.toLowerCase() === token.toLowerCase() &&
          log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        )
        .map(log => ({
          from: '0x' + log.topics[1].slice(26),
          to: '0x' + log.topics[2].slice(26),
          value: BigInt(log.data).toString(),
        }));

      if (tokenTransfers.length === 0) {
        throw new Error('No token transfers found in this transaction');
      }

      addLog('Transfers Found', `Found ${tokenTransfers.length} token transfer(s)`, 'success');
      
      // Log all transfers for debugging
      tokenTransfers.forEach((t, i) => {
        const amount = (Number(t.value) / 1e18).toFixed(4);
        addLog('Transfer Detail', `#${i + 1}: ${t.from.slice(0, 10)}... → ${t.to.slice(0, 10)}... (${amount} tokens)`, 'info');
      });

      // Identify the seller: Find the FIRST INWARD transfer (tokens coming into the transaction)
      // The seller is the address that sent tokens INTO the transaction flow
      // This is the first transfer where tokens enter from an external wallet
      
      let sellerAddress: string | undefined;
      const sellerTransfers: typeof tokenTransfers = [];

      // Find the first non-zero inward transfer to identify the seller
      for (const transfer of tokenTransfers) {
        // Skip zero-value transfers (spam)
        if (BigInt(transfer.value) === 0n) continue;
        
        // The first transfer identifies the seller
        if (!sellerAddress) {
          sellerAddress = transfer.from;
          addLog('Seller Identified', `Seller: ${sellerAddress.slice(0, 10)}... (first inward transfer)`, 'success');
        }
        
        // Collect ALL transfers from the seller (they might sell to multiple addresses)
        if (transfer.from.toLowerCase() === sellerAddress.toLowerCase()) {
          sellerTransfers.push(transfer);
        }
      }

      if (!sellerAddress || sellerTransfers.length === 0) {
        throw new Error('Could not identify seller from token transfers');
      }

      // Sum up all amounts sold by the seller
      const totalAmountSold = sellerTransfers.reduce((sum, transfer) => {
        return sum + BigInt(transfer.value);
      }, 0n);

      addLog('Amount Identified', `Amount: ${(Number(totalAmountSold) / 1e18).toFixed(4)} tokens (${sellerTransfers.length} transfer(s))`, 'info');
      
      // Log each transfer
      sellerTransfers.forEach((transfer, i) => {
        const to = `${transfer.to.slice(0, 6)}...${transfer.to.slice(-4)}`;
        const amount = (Number(transfer.value) / 1e18).toFixed(4);
        addLog('Transfer Detail', `  #${i + 1}: ${sellerAddress!.slice(0, 6)}... → ${to} (${amount} tokens)`, 'info');
      });
      
      // Check if seller is a contract
      const sellerCode = await blockchain.provider.getCode(sellerAddress);
      if (sellerCode !== '0x') {
        addLog('Contract Detected', `Seller ${sellerAddress.slice(0, 10)}... is a contract - stopping trace here`, 'warning');
        
        // Return result with contract as origin
        onAnalysisComplete({
          poolAddress: '',
          tokenAddress: token,
          startTime: 0,
          endTime: 0,
          transactions: [{
            type: 'sell',
            wallet: sellerAddress,
            amount: totalAmountSold.toString(),
            timestamp: 0,
            blockNumber: tx.blockNumber,
            hash: txHash,
          }],
          traces: [{
            address: sellerAddress,
            label: storageUtils.getWalletLabel(sellerAddress),
            amount: totalAmountSold.toString(),
            transaction: txHash,
            timestamp: 0,
            blockNumber: tx.blockNumber,
            isOrigin: true,
            originType: 'contract',
          }],
          statistics: {
            totalBuys: 0,
            totalSells: 1,
            uniqueWallets: 1,
            tracedToOrigin: 1,
          },
        });
        addLog('Done', `Analysis completed - seller is a contract`, 'success');
        return;
      }

      // Initialize tracker (we don't need pool address for single transaction analysis)
      addLog('Initializing Tracker', `Token: ${token.slice(0, 10)}...`, 'info');
      const tracker = new TokenTracker(
        blockchain, 
        '', // No pool needed for single tx analysis
        token,
        (message) => addLog('Token Tracer', message, 'info')
      );

      // Trace the seller's tokens to origin
      addLog('Tracing Token Origin', `Tracing where ${sellerAddress.slice(0, 10)}... got the tokens`, 'info');
      setProgress({ current: 0, total: 1 });
      
      const trace = await tracker.traceToOrigin(
        sellerAddress,
        totalAmountSold.toString(),
        tx.blockNumber,
        txHash
      );

      setProgress({ current: 1, total: 1 });
      addLog('Trace Complete', `Successfully traced to origin`, 'success');

      // Calculate statistics
      addLog('Generating Results', `Preparing display`, 'info');
      onAnalysisComplete({
        poolAddress: '', // Not applicable for single tx
        tokenAddress: token,
        startTime: 0,
        endTime: 0,
        transactions: [{
          type: 'sell',
          wallet: sellerAddress,
          amount: totalAmountSold.toString(),
          timestamp: 0,
          blockNumber: tx.blockNumber,
          hash: txHash,
        }],
        traces: [trace],
        statistics: {
          totalBuys: 0,
          totalSells: 1,
          uniqueWallets: 1,
          tracedToOrigin: trace.isOrigin || trace.source?.isOrigin ? 1 : 0,
        },
      });
      addLog('Done', `Analysis completed successfully`, 'success');
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-4">Trace Token Origin from Transaction</h2>
      <p className="text-slate-400 text-sm mb-4">
        Enter a sell transaction hash to trace where the seller originally got their tokens
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Transaction Hash
            </label>
            <input
              type="text"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              placeholder="0x0e1b8789d9eee8f8adec001aa7d696073f3735f4cba688f8027d4529aa500026"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">
              The transaction hash of the sell you want to analyze
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Token Address
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">
              The token contract address being sold
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && progressLogs.length > 0 && (
          <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-400 font-medium">
                {progressLogs[progressLogs.length - 1]?.step || 'Processing...'}
              </span>
              {progress.total > 0 && (
                <span className="text-sm text-blue-400">
                  {progress.current} / {progress.total}
                </span>
              )}
            </div>
            {progress.total > 0 && (
              <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
            
            {/* Expandable Details */}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors mt-2"
            >
              {showDetails ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Hide Details
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Show Details
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                {progressLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded ${
                      log.type === 'success'
                        ? 'bg-green-900/20 text-green-300'
                        : log.type === 'warning'
                        ? 'bg-yellow-900/20 text-yellow-300'
                        : 'bg-slate-700/30 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-slate-500 mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold">{log.step}</div>
                        <div className="text-[11px] opacity-80">{log.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search size={20} />
              Start Analysis
            </>
          )}
        </button>
      </form>
    </div>
  );
}
