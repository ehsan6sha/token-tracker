import { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TraceNode } from '../types';
import { storageUtils } from '../utils/storage';
import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  trace: TraceNode;
  network?: string;
}

const getBlockExplorerUrl = (network: string = 'base-mainnet'): string => {
  const explorerMap: Record<string, string> = {
    'eth-mainnet': 'https://etherscan.io',
    'eth-sepolia': 'https://sepolia.etherscan.io',
    'base-mainnet': 'https://basescan.org',
    'polygon-mainnet': 'https://polygonscan.com',
    'arbitrum-mainnet': 'https://arbiscan.io',
    'optimism-mainnet': 'https://optimistic.etherscan.io',
  };
  return explorerMap[network] || 'https://basescan.org';
};

const getOriginTypeColor = (originType?: string): string => {
  switch (originType) {
    case 'dex':
      return '#3b82f6'; // blue
    case 'contract':
      return '#8b5cf6'; // purple
    case 'aggregator':
      return '#f97316'; // orange
    case 'cex':
      return '#10b981'; // green
    default:
      return '#6b7280'; // gray
  }
};

const getOriginTypeLabel = (originType?: string): string => {
  switch (originType) {
    case 'dex':
      return '🔵 DEX Pool';
    case 'contract':
      return '🟣 Token Contract';
    case 'aggregator':
      return '🟠 Aggregator';
    case 'cex':
      return '🟢 CEX';
    default:
      return '⚪ Unknown';
  }
};

const formatAmount = (amount: string): string => {
  try {
    const num = BigInt(amount);
    const formatted = Number(num) / 1e18;
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return '0';
  }
};

export default function TraceBubbleMap({ trace, network = 'base-mainnet' }: Props) {
  // Build nodes and edges from trace tree
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const explorerUrl = getBlockExplorerUrl(network);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    let yPosition = 0;
    const ySpacing = 150;

    const buildGraph = (node: TraceNode, parentId: string | null, depth: number) => {
      const currentId = `node-${nodeId++}`;
      const amount = formatAmount(node.amount);
      const shortAddr = `${node.address.slice(0, 6)}...${node.address.slice(-4)}`;
      
      // Get label from storage or use provided label
      const walletLabel = storageUtils.getWalletLabel(node.address) || node.label;
      
      // Format timestamp
      const timeDisplay = node.timestamp > 0 
        ? formatDistanceToNow(new Date(node.timestamp * 1000), { addSuffix: true })
        : 'Unknown time';
      
      // Calculate bubble size based on amount
      const amountNum = Number(node.amount) / 1e18;
      const bubbleSize = Math.max(100, Math.min(220, 100 + Math.log10(amountNum + 1) * 20));

      // Create node
      nodes.push({
        id: currentId,
        type: 'default',
        position: { x: depth * 300, y: yPosition },
        data: {
          label: (
            <div className="text-center">
              <div className="font-bold text-sm">{walletLabel || shortAddr}</div>
              {walletLabel && <div className="text-xs text-gray-400 mt-1">{shortAddr}</div>}
              <div className="text-xs font-semibold mt-1">{amount} tokens</div>
              <div className="text-xs text-gray-400 mt-1">{timeDisplay}</div>
              {node.isOrigin && (
                <div className="text-xs mt-1 font-bold">
                  {getOriginTypeLabel(node.originType)}
                </div>
              )}
              <a
                href={`${explorerUrl}/tx/${node.transaction}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                View TX <ExternalLink size={10} />
              </a>
            </div>
          ),
        },
        style: {
          background: node.isOrigin ? getOriginTypeColor(node.originType) : '#1e293b',
          color: 'white',
          border: node.isOrigin ? '3px solid #fbbf24' : '2px solid #475569',
          borderRadius: '50%',
          width: bubbleSize,
          height: bubbleSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
          fontSize: '11px',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      // Create edge from parent (arrow points from source to current wallet)
      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId, // Arrow starts from source (origin)
          target: currentId, // Arrow points to current wallet (seller)
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#64748b',
          },
          // Edge label shows contributing amount from this source (child node)
          label: `${amount} tokens`,
          labelStyle: { fill: '#cbd5e1', fontSize: 12, fontWeight: 600 },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: '#0f172a', stroke: '#334155' },
        });
      }

      yPosition += ySpacing;

      // Recursively build for source(s)
      if (node.sources && node.sources.length > 0) {
        // Multiple sources - build all of them
        node.sources.forEach((sourceNode) => {
          buildGraph(sourceNode, currentId, depth + 1);
        });
      } else if (node.source) {
        // Single source - original behavior
        buildGraph(node.source, currentId, depth + 1);
      }
    };

    buildGraph(trace, null, 0);

    return { nodes, edges };
  }, [trace, network]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[600px] bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
        className="bg-slate-900"
      >
        <Background color="#334155" gap={16} />
        <Controls className="bg-slate-800 border-slate-700" />
        <MiniMap
          className="bg-slate-800 border-slate-700"
          nodeColor={(node) => {
            const isOrigin = nodes.find(n => n.id === node.id)?.data?.label?.props?.children?.[3];
            return isOrigin ? '#fbbf24' : '#1e293b';
          }}
        />
      </ReactFlow>
      
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm p-4 rounded-lg border border-slate-700 text-xs">
        <div className="font-semibold text-white mb-2">Legend:</div>
        <div className="space-y-1 text-slate-300">
          <div>🔵 DEX Pool - Bought from liquidity pool</div>
          <div>🟣 Token Contract - Minted/Airdropped</div>
          <div>🟠 Aggregator - From 1inch, 0x, etc.</div>
          <div>🟢 CEX - From exchange wallet</div>
          <div>⚪ Unknown - Origin unclear</div>
        </div>
        <div className="mt-3 text-slate-400 text-[10px]">
          💡 Drag to pan • Scroll to zoom • Click nodes for details
        </div>
      </div>
    </div>
  );
}
