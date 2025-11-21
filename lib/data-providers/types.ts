export interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'future';
  currentPrice: number;
  change: number;
  changePercent: number;
  currency?: string;
  exchange?: string;
  lastUpdated: Date;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'future';
  currency?: string;
  exchange?: string;
}

export interface QuoteData {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  lastUpdated: Date;
}

export interface HistoricalData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DataProvider {
  name: string;
  searchAssets(query: string, assetType?: 'stock' | 'crypto' | 'future' | null): Promise<SearchResult[]>;
  getAssetQuote(symbol: string): Promise<QuoteData | null>;
  getAssetDetails(symbol: string): Promise<Asset | null>;
  getHistoricalData?(symbol: string, timeframe: '1h' | '1d' | '1M' | '1Y', coinId?: string): Promise<HistoricalData[]>;
  isHealthy(): Promise<boolean>;
  getAttribution?(): { text: string; logoUrl: string; linkUrl: string };
}

export interface DataProviderConfig {
  apiKey: string;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}
