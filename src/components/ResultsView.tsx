import { useState } from 'react';
import { AnalysisResult, TraceNode } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronRight, ExternalLink, TrendingDown, TrendingUp, Map } from 'lucide-react';
import TraceBubbleMap from './TraceBubbleMap';

interface Props {
  result: AnalysisResult;
  network?: string;
}

export default function ResultsView({ result, network = 'base-mainnet' }: Props) {
  const [expandedTraces, setExpandedTraces] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map'); // Default to bubble map

  const toggleTrace = (index: number) => {
    const newExpanded = new Set(expandedTraces);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTraces(newExpanded);
  };

  const formatAddress = (address: string, label?: string): string => {
    if (label) return label;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string): string => {
    try {
      const num = BigInt(amount);
      const formatted = Number(num) / 1e18;
      return formatted.toLocaleString(undefined, { maximumFractionDigits: 4 });
    } catch {
      return amount;
    }
  };

  const getOriginBadge = (type?: string) => {
    const badges = {
      dex: { color: 'bg-blue-500', text: 'DEX Pool' },
      contract: { color: 'bg-purple-500', text: 'Token Contract' },
      aggregator: { color: 'bg-orange-500', text: 'Aggregator' },
      cex: { color: 'bg-green-500', text: 'CEX' },
      unknown: { color: 'bg-slate-500', text: 'Unknown' },
    };

    const badge = badges[type as keyof typeof badges] || badges.unknown;
    return (
      <span className={`px-2 py-1 ${badge.color} text-white text-xs rounded-full`}>
        {badge.text}
      </span>
    );
  };

  const renderTraceChain = (node: TraceNode, depth: number = 0) => {
    const indent = depth * 24;

    return (
      <div key={`${node.address}-${depth}`} style={{ marginLeft: `${indent}px` }}>
        <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-white font-medium">
                {formatAddress(node.address, node.label)}
              </span>
              {node.isOrigin && getOriginBadge(node.originType)}
            </div>
            <div className="text-sm text-slate-400 space-y-1">
              <p>Amount: {formatAmount(node.amount)}</p>
              {node.timestamp > 0 && (
                <p>
                  Time: {formatDistanceToNow(new Date(node.timestamp * 1000), { addSuffix: true })}
                </p>
              )}
              <a
                href={`https://etherscan.io/tx/${node.transaction}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                View TX <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
        {node.source && renderTraceChain(node.source, depth + 1)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Transactions List */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">DEX Transactions</h3>
        </div>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {result.transactions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No transactions found in this timeframe</p>
          ) : (
            result.transactions.map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {tx.type === 'buy' ? (
                    <TrendingUp className="text-green-400" size={20} />
                  ) : (
                    <TrendingDown className="text-red-400" size={20} />
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {tx.type === 'buy' ? 'Buy' : 'Sell'} - {formatAmount(tx.amount)}
                    </p>
                    <p className="text-slate-400 text-sm font-mono">
                      {formatAddress(tx.wallet)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm">
                    {formatDistanceToNow(new Date(tx.timestamp * 1000), { addSuffix: true })}
                  </p>
                  <a
                    href={`https://etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1"
                  >
                    View <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trace Results */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Token Origin Traces</h3>
              <p className="text-slate-400 text-sm mt-1">
                {viewMode === 'list' ? 'Click to expand and view the full trace chain' : 'Interactive bubble map visualization'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <ChevronRight size={16} />
                List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Map size={16} />
                Bubble Map
              </button>
            </div>
          </div>
        </div>
        {viewMode === 'map' ? (
          <div className="p-4">
            {result.traces.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No sell transactions to trace</p>
            ) : (
              <div className="space-y-4">
                {result.traces.map((trace, index) => (
                  <div key={`${trace.transaction}-${index}`}>
                    <h4 className="text-white font-medium mb-2">Trace #{index + 1} - {formatAddress(trace.address, trace.label)}</h4>
                    <TraceBubbleMap key={`map-${trace.transaction}-${index}`} trace={trace} network={network} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {result.traces.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No sell transactions to trace</p>
            ) : (
              result.traces.map((trace, index) => (
              <div key={index} className="border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleTrace(index)}
                  className="w-full flex items-center justify-between p-4 bg-slate-700/20 hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedTraces.has(index) ? (
                      <ChevronDown size={20} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={20} className="text-slate-400" />
                    )}
                    <div className="text-left">
                      <p className="text-white font-medium">
                        Trace #{index + 1} - {formatAddress(trace.address, trace.label)}
                      </p>
                      <p className="text-slate-400 text-sm">
                        Amount: {formatAmount(trace.amount)}
                      </p>
                    </div>
                  </div>
                  {trace.isOrigin && getOriginBadge(trace.originType)}
                </button>

                {expandedTraces.has(index) && (
                  <div className="p-4 bg-slate-800/30">
                    {renderTraceChain(trace)}
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
