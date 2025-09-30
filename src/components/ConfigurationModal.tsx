import { useState } from 'react';
import { ApiConfig } from '../types';
import { X } from 'lucide-react';

interface Props {
  initialConfig: ApiConfig | null;
  onSave: (config: ApiConfig) => void;
  onClose: () => void;
}

const NETWORKS = {
  alchemy: ['eth-mainnet', 'eth-sepolia', 'polygon-mainnet', 'arbitrum-mainnet', 'optimism-mainnet', 'base-mainnet'],
  infura: ['mainnet', 'sepolia', 'polygon-mainnet', 'arbitrum-mainnet', 'optimism-mainnet'],
  quicknode: ['Custom URL'],
};

export default function ConfigurationModal({ initialConfig, onSave, onClose }: Props) {
  const [provider, setProvider] = useState<'alchemy' | 'quicknode' | 'infura'>(
    initialConfig?.provider || 'alchemy'
  );
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [network, setNetwork] = useState(initialConfig?.network || 'base-mainnet');
  const [blockRangeLimit, setBlockRangeLimit] = useState(initialConfig?.blockRangeLimit || 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert('Please enter an API key or URL');
      return;
    }
    onSave({ provider, apiKey: apiKey.trim(), network, blockRangeLimit });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">API Configuration</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const newProvider = e.target.value as typeof provider;
                setProvider(newProvider);
                setNetwork(NETWORKS[newProvider][0]);
              }}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="alchemy">Alchemy</option>
              <option value="infura">Infura</option>
              <option value="quicknode">QuickNode</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {provider === 'quicknode' ? 'Endpoint URL' : 'API Key'}
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === 'quicknode'
                  ? 'https://your-endpoint.quiknode.pro/...'
                  : 'Enter your API key'
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {provider !== 'quicknode' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Network
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {NETWORKS[provider].map((net) => (
                  <option key={net} value={net}>
                    {net}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Block Range Limit
            </label>
            <select
              value={blockRangeLimit}
              onChange={(e) => setBlockRangeLimit(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10 blocks (Free Tier)</option>
              <option value={100}>100 blocks (Growth Tier)</option>
              <option value={2000}>2000 blocks (Pro Tier)</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Free tier: 10 blocks. Upgrade your API plan for larger ranges.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
