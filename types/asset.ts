export interface Asset {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  type: 'stock' | 'crypto' | 'future';
  lastUpdated?: string;
}

export interface PortfolioAsset extends Asset {
  addedAt: string;
}
