import { useState, useEffect } from 'react';
import { ApiConfig } from './types';
import { storageUtils } from './utils/storage';
import ConfigurationModal from './components/ConfigurationModal';
import WalletLabelsModal from './components/WalletLabelsModal';
import AnalysisForm from './components/AnalysisForm';
import ResultsView from './components/ResultsView';
import { Settings, Tag } from 'lucide-react';

function App() {
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  useEffect(() => {
    const config = storageUtils.getApiConfig();
    setApiConfig(config);
    if (!config) {
      setShowConfigModal(true);
    }
  }, []);

  const handleConfigSave = (config: ApiConfig) => {
    storageUtils.saveApiConfig(config);
    setApiConfig(config);
    setShowConfigModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Token Origin Tracker
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Trace token transactions to their source
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLabelsModal(true)}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                title="Manage Wallet Labels"
              >
                <Tag size={20} />
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                title="API Configuration"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!apiConfig ? (
          <div className="max-w-2xl mx-auto bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 text-center border border-slate-700">
            <Settings size={48} className="mx-auto text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Configure API Access
            </h2>
            <p className="text-slate-400 mb-6">
              Please configure your blockchain API provider to get started.
            </p>
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Configure Now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <AnalysisForm
              apiConfig={apiConfig}
              onAnalysisComplete={setAnalysisResult}
            />
            {analysisResult && <ResultsView result={analysisResult} />}
          </div>
        )}
      </main>

      {/* Modals */}
      {showConfigModal && (
        <ConfigurationModal
          initialConfig={apiConfig}
          onSave={handleConfigSave}
          onClose={() => {
            setShowConfigModal(false);
            // If no config exists, user must configure
            if (!apiConfig) {
              // Keep modal open
              setShowConfigModal(true);
            }
          }}
        />
      )}

      {showLabelsModal && (
        <WalletLabelsModal onClose={() => setShowLabelsModal(false)} />
      )}
    </div>
  );
}

export default App;
