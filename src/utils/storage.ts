import { ApiConfig, WalletLabel } from '../types';

const API_CONFIG_KEY = 'token_tracker_api_config';
const WALLET_LABELS_KEY = 'token_tracker_wallet_labels';

export const storageUtils = {
  // API Configuration
  saveApiConfig(config: ApiConfig): void {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
  },

  getApiConfig(): ApiConfig | null {
    const stored = localStorage.getItem(API_CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  clearApiConfig(): void {
    localStorage.removeItem(API_CONFIG_KEY);
  },

  // Wallet Labels
  saveWalletLabels(labels: WalletLabel[]): void {
    localStorage.setItem(WALLET_LABELS_KEY, JSON.stringify(labels));
  },

  getWalletLabels(): WalletLabel[] {
    const stored = localStorage.getItem(WALLET_LABELS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addWalletLabel(label: WalletLabel): void {
    const labels = this.getWalletLabels();
    const existingIndex = labels.findIndex(
      (l) => l.address.toLowerCase() === label.address.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      labels[existingIndex] = label;
    } else {
      labels.push(label);
    }
    
    this.saveWalletLabels(labels);
  },

  removeWalletLabel(address: string): void {
    const labels = this.getWalletLabels();
    const filtered = labels.filter(
      (l) => l.address.toLowerCase() !== address.toLowerCase()
    );
    this.saveWalletLabels(filtered);
  },

  getWalletLabel(address: string): string | undefined {
    const labels = this.getWalletLabels();
    const label = labels.find(
      (l) => l.address.toLowerCase() === address.toLowerCase()
    );
    return label?.label;
  },
};
