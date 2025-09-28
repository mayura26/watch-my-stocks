import { DataProvider, SearchResult, QuoteData, Asset, HistoricalData } from './types';
import { FinnhubProvider } from './finnhub';
import { CoinGeckoProvider } from './coingecko';
import { YahooFinanceProvider } from './yahoo-finance';
import { PolygonProvider } from './polygon';
// Lazy import for database to avoid connection issues in test scripts

/**
 * DataManager - Database-Driven Asset Provider Router
 * 
 * This class routes asset requests to the appropriate data provider based on the 
 * asset type stored in the database when the asset was added to the portfolio.
 * 
 * Architecture:
 * 1. Database-First: Looks up asset_type from available_assets table
 * 2. Provider Routing: Routes based on stored type (crypto→CoinGecko, future→Yahoo, stock→Finnhub)
 * 3. Fallback: Uses legacy symbol detection if database unavailable
 * 
 * This eliminates the need for hardcoded symbol lists and ensures accurate routing
 * based on how users actually categorized their assets.
 */
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
          requestsPerDay: 10000
        }
      }));
    }

    // Initialize CoinGecko for crypto only
    if (process.env.COINGECKO_API_KEY) {
      this.providers.push(new CoinGeckoProvider({
        apiKey: process.env.COINGECKO_API_KEY,
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: {
          requestsPerMinute: 50,
          requestsPerDay: 10000
        }
      }));
    } else {
      // Always initialize CoinGecko even without API key for demo usage
      this.providers.push(new CoinGeckoProvider({
        apiKey: '',
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: {
          requestsPerMinute: 50,
          requestsPerDay: 10000
        }
      }));
    }

    // Initialize Yahoo Finance for futures
    this.providers.push(new YahooFinanceProvider({
      apiKey: '', // Yahoo Finance doesn't require API key
      baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerDay: 100000
      }
    }));

    // Initialize Polygon for additional data (optional)
    if (process.env.POLYGON_API_KEY) {
      this.providers.push(new PolygonProvider({
        apiKey: process.env.POLYGON_API_KEY,
        baseUrl: 'https://api.polygon.io/v2',
        rateLimit: {
          requestsPerMinute: 5,
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

  private async getAssetTypeFromDatabase(symbol: string): Promise<'stock' | 'crypto' | 'future' | null> {
    try {
      // Lazy import to avoid connection issues
      const { getClient } = await import('../db');
      const client = getClient();
      const result = await client.execute({
        sql: 'SELECT asset_type FROM available_assets WHERE symbol = ?',
        args: [symbol.toUpperCase()]
      });
      
      if (result.rows.length > 0) {
        return result.rows[0].asset_type as 'stock' | 'crypto' | 'future';
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching asset type from database:', error);
      // Fallback to legacy symbol detection if database is not available
      console.log('Falling back to legacy symbol detection for', symbol);
      return this.determineAssetType(symbol);
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
    
    // Get asset type from database (falls back to symbol detection if DB unavailable)
    const assetType = await this.getAssetTypeFromDatabase(symbol);
    
    if (assetType === 'crypto') {
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
    } else if (assetType === 'future') {
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
      // Stock quotes → Finnhub only (default)
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
    
    // Get asset type from database (falls back to symbol detection if DB unavailable)
    const assetType = await this.getAssetTypeFromDatabase(symbol);
    
    if (assetType === 'crypto') {
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
    } else if (assetType === 'future') {
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
      // Stock details → Finnhub only (default)
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

  async getHistoricalData(symbol: string, timeframe: '15m' | '1d', coinId?: string): Promise<HistoricalData[]> {
    this.ensureInitialized();
    
    if (this.providers.length === 0) {
      console.warn('No data providers available. Please configure API keys in environment variables.');
      return [];
    }
    
    // Get asset type from database (falls back to symbol detection if DB unavailable)
    const assetType = await this.getAssetTypeFromDatabase(symbol);
    
    if (assetType === 'crypto') {
      // Crypto historical data → CoinGecko only
      const coinGeckoProvider = this.providers.find(p => p.name === 'CoinGecko');
      if (coinGeckoProvider) {
        try {
          if (coinGeckoProvider.getHistoricalData) {
            return await coinGeckoProvider.getHistoricalData(symbol, timeframe, coinId);
          }
        } catch (error) {
          console.error(`CoinGecko historical data failed for ${symbol}:`, error);
        }
      }
      return [];
    } else if (assetType === 'future') {
      // Futures historical data → Yahoo Finance only
      const yahooProvider = this.providers.find(p => p.name === 'YahooFinance');
      if (yahooProvider) {
        try {
          if (yahooProvider.getHistoricalData) {
            return await yahooProvider.getHistoricalData(symbol, timeframe);
          }
        } catch (error) {
          console.error(`Yahoo Finance historical data failed for ${symbol}:`, error);
        }
      }
      return [];
    } else {
      // Stock historical data → Finnhub only (default)
      const finnhubProvider = this.providers.find(p => p.name === 'Finnhub');
      if (finnhubProvider) {
        try {
          if (finnhubProvider.getHistoricalData) {
            return await finnhubProvider.getHistoricalData(symbol, timeframe);
          }
        } catch (error) {
          console.error(`Finnhub historical data failed for ${symbol}:`, error);
        }
      }
      return [];
    }
  }

  // Fallback methods for when database is unavailable (e.g., test scripts)
  private isCryptoSymbol(symbol: string): boolean {
    // Common crypto symbols for fallback detection
    const cryptoSymbols = [
      'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'XRP', 'XLM', 'EOS',
      'TRX', 'BNB', 'AVAX', 'MATIC', 'ATOM', 'ALGO', 'VET', 'DOGE', 'SHIB', 'UNI',
      'AAVE', 'COMP', 'MKR', 'SNX', 'YFI', 'CRV', 'ICP', 'NEAR', 'FTM', 'MANA',
      'SAND', 'AXS', 'CHZ', 'ENJ', 'BAT', 'ZRX', 'KNC', 'REN', 'LRC', 'OMG',
      'HYPE', 'SUI'
    ];
    
    const upperSymbol = symbol.toUpperCase();
    return cryptoSymbols.includes(upperSymbol);
  }

  private isFuturesSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    
    // Check for futures suffix
    if (upperSymbol.endsWith('=F')) {
      return true;
    }
    
    // Check for common futures patterns
    const futurePatterns = [
      /^ES\d{2}$/, // E-mini S&P 500
      /^NQ\d{2}$/, // E-mini NASDAQ
      /^YM\d{2}$/, // E-mini Dow
      /^RTY\d{2}$/, // E-mini Russell 2000
      /^GC\d{2}$/, // Gold
      /^SI\d{2}$/, // Silver
      /^CL\d{2}$/, // Crude Oil
      /^NG\d{2}$/, // Natural Gas
      /^ZC\d{2}$/, // Corn
      /^ZS\d{2}$/, // Soybeans
      /^ZW\d{2}$/, // Wheat
    ];
    
    return futurePatterns.some(pattern => pattern.test(upperSymbol));
  }

  private determineAssetType(symbol: string): 'stock' | 'crypto' | 'future' {
    if (this.isCryptoSymbol(symbol)) {
      return 'crypto';
    } else if (this.isFuturesSymbol(symbol)) {
      return 'future';
    }
    return 'stock';
  }

  getProviders(): DataProvider[] {
    this.ensureInitialized();
    return [...this.providers];
  }

  getAttributions(): Array<{ text: string; logoUrl: string; linkUrl: string }> {
    this.ensureInitialized();
    return this.providers.map(provider => {
      if ('getAttribution' in provider && typeof provider.getAttribution === 'function') {
        return provider.getAttribution();
      }
      return null;
    }).filter((attr): attr is { text: string; logoUrl: string; linkUrl: string } => attr !== null);
  }

  async isHealthy(): Promise<boolean> {
    this.ensureInitialized();
    
    if (this.providers.length === 0) {
      return false;
    }
    
    // Check if at least one provider is healthy
    for (const provider of this.providers) {
      try {
        if (await provider.isHealthy()) {
          return true;
        }
      } catch (error) {
        console.error(`Provider ${provider.name} health check failed:`, error);
      }
    }
    
    return false;
  }

  async getMultipleQuotes(symbols: string[]): Promise<Map<string, QuoteData>> {
    const quotesMap = new Map<string, QuoteData>();
    
    // Process quotes in parallel for better performance
    const quotePromises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getAssetQuote(symbol);
        if (quote) {
          quotesMap.set(symbol, quote);
        }
      } catch (error) {
        console.error(`Failed to get quote for ${symbol}:`, error);
      }
    });
    
    await Promise.all(quotePromises);
    return quotesMap;
  }
}

// Export singleton instance
export const dataManager = new DataManager();
