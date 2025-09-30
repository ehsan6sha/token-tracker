import { useState, useEffect } from 'react';
import { WalletLabel } from '../types';
import { storageUtils } from '../utils/storage';
import { X, Plus, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function WalletLabelsModal({ onClose }: Props) {
  const [labels, setLabels] = useState<WalletLabel[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    setLabels(storageUtils.getWalletLabels());
  }, []);

  const handleAdd = () => {
    if (!newAddress.trim() || !newLabel.trim()) {
      alert('Please enter both address and label');
      return;
    }

    // Basic validation for Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress.trim())) {
      alert('Invalid Ethereum address format');
      return;
    }

    storageUtils.addWalletLabel({
      address: newAddress.trim(),
      label: newLabel.trim(),
    });

    setLabels(storageUtils.getWalletLabels());
    setNewAddress('');
    setNewLabel('');
  };

  const handleRemove = (address: string) => {
    storageUtils.removeWalletLabel(address);
    setLabels(storageUtils.getWalletLabels());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full border border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Wallet Labels</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Add New Label */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Add New Label</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label name"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* Labels List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-300">Saved Labels</h3>
            {labels.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No wallet labels saved yet
              </p>
            ) : (
              <div className="space-y-2">
                {labels.map((label) => (
                  <div
                    key={label.address}
                    className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{label.label}</p>
                      <p className="text-slate-400 text-sm font-mono truncate">
                        {label.address}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(label.address)}
                      className="ml-3 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
