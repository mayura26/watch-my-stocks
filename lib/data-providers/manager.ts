import { DataProvider, SearchResult, QuoteData, Asset, HistoricalData } from './types';
import { FinnhubProvider } from './finnhub';
import { CoinGeckoProvider } from './coingecko';
import { YahooFinanceProvider } from './yahoo-finance';
import { PolygonProvider } from './polygon';

export class DataManager {
  private providers: DataProvider[] = [];
  private initialized = false;

  constructor() {
    // Don't initialize providers in constructor
    // They will be initialized on first use
  }

  private initializeProviders() {
    // Initialize Finnhub for stocks only
    if (process.env.FINNHUB_API_KEY) {
      this.providers.push(new FinnhubProvider({
        apiKey: process.env.FINNHUB_API_KEY,
        baseUrl: 'https://finnhub.io/api/v1',
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerDay: 1000
        }
      }));
    }

    // Initialize CoinGecko for cryptocurrency data
    if (process.env.COINGECKO_API_KEY) {
      this.providers.push(new CoinGeckoProvider({
        apiKey: process.env.COINGECKO_API_KEY,
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: {
          requestsPerMinute: 30,
          requestsPerDay: 10000
        }
      }));
    } else {
      // Add CoinGecko without API key for basic usage (rate limited)
      this.providers.push(new CoinGeckoProvider({
        apiKey: '',
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: {
          requestsPerMinute: 10,
          requestsPerDay: 100
        }
      }));
    }

    // Initialize Yahoo Finance for futures data
    this.providers.push(new YahooFinanceProvider({
      apiKey: '', // Yahoo Finance doesn't require API key
      baseUrl: 'https://query1.finance.yahoo.com',
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerDay: 2000
      }
    }));

    // Initialize Polygon.io for stocks data
    if (process.env.POLYGON_API_KEY) {
      this.providers.push(new PolygonProvider({
        apiKey: process.env.POLYGON_API_KEY,
        baseUrl: 'https://api.polygon.io',
        rateLimit: {
          requestsPerMinute: 5, // Free tier limit
          requestsPerDay: 1000
        }
      }));
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initializeProviders();
      this.initialized = true;
    }
  }

  async searchAssets(query: string, assetType?: 'stock' | 'crypto' | 'future' | null): Promise<SearchResult[]> {
    this.ensureInitialized();
    
    if (this.providers.length === 0) {
      console.warn('No data providers available. Please configure API keys in environment variables.');
      return [];
    }
    
    // Locked-down provider routing
    if (assetType === 'crypto') {
      // Crypto searches → CoinGecko only
      const coinGeckoProvider = this.providers.find(p => p.name === 'CoinGecko');
      if (coinGeckoProvider) {
        try {
          return await coinGeckoProvider.searchAssets(query, assetType);
        } catch (error) {
          console.error('CoinGecko crypto search failed:', error);
        }
      }
      return [];
    } else if (assetType === 'future') {
      // Futures searches → Yahoo Finance only
      const yahooProvider = this.providers.find(p => p.name === 'YahooFinance');
      if (yahooProvider) {
        try {
          return await yahooProvider.searchAssets(query, assetType);
        } catch (error) {
          console.error('Yahoo Finance futures search failed:', error);
        }
      }
      return [];
    } else {
      // Stock searches → Finnhub only
      const finnhubProvider = this.providers.find(p => p.name === 'Finnhub');
      if (finnhubProvider) {
        try {
          return await finnhubProvider.searchAssets(query, assetType);
        } catch (error) {
          console.error('Finnhub stock search failed:', error);
        }
      }
      return [];
    }
  }

  async getAssetQuote(symbol: string): Promise<QuoteData | null> {
    this.ensureInitialized();
    
    if (this.providers.length === 0) {
      console.warn('No data providers available. Please configure API keys in environment variables.');
      return null;
    }
    
    // Locked-down provider routing based on symbol type
    const isCryptoSymbol = this.isCryptoSymbol(symbol);
    const isFuturesSymbol = this.isFuturesSymbol(symbol);
    
    if (isCryptoSymbol) {
      // Crypto quotes → CoinGecko only
      const coinGeckoProvider = this.providers.find(p => p.name === 'CoinGecko');
      if (coinGeckoProvider) {
        try {
          return await coinGeckoProvider.getAssetQuote(symbol);
        } catch (error) {
          console.error(`CoinGecko quote failed for ${symbol}:`, error);
        }
      }
      return null;
    } else if (isFuturesSymbol) {
      // Futures quotes → Yahoo Finance only
      const yahooProvider = this.providers.find(p => p.name === 'YahooFinance');
      if (yahooProvider) {
        try {
          return await yahooProvider.getAssetQuote(symbol);
        } catch (error) {
          console.error(`Yahoo Finance quote failed for ${symbol}:`, error);
        }
      }
      return null;
    } else {
      // Stock quotes → Finnhub only
      const finnhubProvider = this.providers.find(p => p.name === 'Finnhub');
      if (finnhubProvider) {
        try {
          return await finnhubProvider.getAssetQuote(symbol);
        } catch (error) {
          console.error(`Finnhub quote failed for ${symbol}:`, error);
        }
      }
      return null;
    }
  }

  async getAssetDetails(symbol: string): Promise<Asset | null> {
    this.ensureInitialized();
    
    if (this.providers.length === 0) {
      console.warn('No data providers available. Please configure API keys in environment variables.');
      return null;
    }
    
    // Locked-down provider routing based on symbol type
    const isCryptoSymbol = this.isCryptoSymbol(symbol);
    const isFuturesSymbol = this.isFuturesSymbol(symbol);
    
    if (isCryptoSymbol) {
      // Crypto details → CoinGecko only
      const coinGeckoProvider = this.providers.find(p => p.name === 'CoinGecko');
      if (coinGeckoProvider) {
        try {
          return await coinGeckoProvider.getAssetDetails(symbol);
        } catch (error) {
          console.error(`CoinGecko asset details failed for ${symbol}:`, error);
        }
      }
      return null;
    } else if (isFuturesSymbol) {
      // Futures details → Yahoo Finance only
      const yahooProvider = this.providers.find(p => p.name === 'YahooFinance');
      if (yahooProvider) {
        try {
          return await yahooProvider.getAssetDetails(symbol);
        } catch (error) {
          console.error(`Yahoo Finance asset details failed for ${symbol}:`, error);
        }
      }
      return null;
    } else {
      // Stock details → Finnhub only
      const finnhubProvider = this.providers.find(p => p.name === 'Finnhub');
      if (finnhubProvider) {
        try {
          return await finnhubProvider.getAssetDetails(symbol);
        } catch (error) {
          console.error(`Finnhub asset details failed for ${symbol}:`, error);
        }
      }
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<Map<string, QuoteData>> {
    this.ensureInitialized();
    
    const quotes = new Map<string, QuoteData>();
    
    // Process symbols in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const promises = batch.map(async (symbol) => {
        const quote = await this.getAssetQuote(symbol);
        if (quote) {
          quotes.set(symbol, quote);
        }
      });
      
      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return quotes;
  }

  async getHistoricalData(symbol: string, timeframe: '15m' | '1d'): Promise<HistoricalData[]> {
    this.ensureInitialized();
    
    if (this.providers.length === 0) {
      console.warn('No data providers available. Please configure API keys in environment variables.');
      return [];
    }

    // Route to specific provider based on asset type
    const assetType = this.determineAssetType(symbol);
    
    try {
      if (assetType === 'future') {
        // Use Yahoo Finance for futures
        const yahooProvider = this.providers.find(p => p.name === 'YahooFinance');
        if (yahooProvider?.getHistoricalData) {
          return await yahooProvider.getHistoricalData(symbol, timeframe);
        }
      } else if (assetType === 'stock') {
        // Use Polygon.io for stocks
        const polygonProvider = this.providers.find(p => p.name === 'Polygon.io');
        if (polygonProvider?.getHistoricalData) {
          return await polygonProvider.getHistoricalData(symbol, timeframe);
        }
      } else if (assetType === 'crypto') {
        // Use CoinGecko for crypto
        const coinGeckoProvider = this.providers.find(p => p.name === 'CoinGecko');
        if (coinGeckoProvider?.getHistoricalData) {
          return await coinGeckoProvider.getHistoricalData(symbol, timeframe);
        }
      }
    } catch (error) {
      console.error(`Error fetching historical data from ${assetType} provider:`, error);
      
      // If it's a rate limit error, throw it immediately to provide better feedback
      if (error instanceof Error && (
        error.message.includes('rate limit') || 
        error.message.includes('429') ||
        error.message.includes('consent') ||
        error.message.includes('yahoo')
      )) {
        throw error;
      }
    }

    // Fallback: try all providers
    for (const provider of this.providers) {
      try {
        if (provider.getHistoricalData) {
          const data = await provider.getHistoricalData(symbol, timeframe);
          if (data && data.length > 0) {
            return data;
          }
        }
      } catch (error) {
        console.error(`Error fetching historical data from ${provider.name}:`, error);
      }
    }
    
    return [];
  }

  private determineAssetType(symbol: string): 'stock' | 'crypto' | 'future' {
    // Check for futures (ends with =F)
    if (symbol.endsWith('=F')) {
      return 'future';
    }
    
    // Check for crypto symbols
    if (this.isCryptoSymbol(symbol)) {
      return 'crypto';
    }
    
    // Default to stock
    return 'stock';
  }

  private isCryptoSymbol(symbol: string): boolean {
    // Common crypto symbols (using native CoinGecko symbols)
    const cryptoSymbols = [
      'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'XRP', 'XLM', 'EOS',
      'TRX', 'BNB', 'AVAX', 'MATIC', 'ATOM', 'ALGO', 'VET', 'DOGE', 'SHIB', 'UNI',
      'AAVE', 'COMP', 'MKR', 'SNX', 'YFI', 'CRV', 'ICP', 'NEAR', 'FTM', 'MANA',
      'SAND', 'AXS', 'CHZ', 'ENJ', 'BAT', 'ZRX', 'KNC', 'REN', 'LRC', 'OMG'
    ];
    
    const upperSymbol = symbol.toUpperCase();
    return cryptoSymbols.includes(upperSymbol);
  }

  private isFuturesSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    
    // Check for Yahoo Finance futures format (=F suffix)
    if (upperSymbol.endsWith('=F')) {
      return true;
    }
    
    // Check for standard futures patterns
    const futurePatterns = [
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{2}$/, // Standard futures pattern (ES23, NQ23, etc.)
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{4}$/, // Extended futures pattern
      /^6[A-Z]=F$/, // Currency futures (6E=F, 6J=F, etc.)
      /^[A-Z]{2}=F$/, // Other futures (ES=F, NQ=F, etc.)
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{2}[FGHJKMNQUVXZ]$/ // Double letter futures
    ];
    
    return futurePatterns.some(pattern => pattern.test(upperSymbol));
  }

  async getProviderHealth(): Promise<{ name: string; healthy: boolean }[]> {
    this.ensureInitialized();
    
    const healthChecks = this.providers.map(async (provider) => ({
      name: provider.name,
      healthy: await provider.isHealthy()
    }));
    
    return Promise.all(healthChecks);
  }

  getProviders(): DataProvider[] {
    this.ensureInitialized();
    return this.providers;
  }

  getAttributions(): Array<{ provider: string; attribution: { text: string; logoUrl: string; linkUrl: string } }> {
    this.ensureInitialized();
    
    return this.providers
      .filter(provider => provider.getAttribution)
      .map(provider => ({
        provider: provider.name,
        attribution: provider.getAttribution!()
      }));
  }
}

// Singleton instance
export const dataManager = new DataManager();
