import { DataProvider, SearchResult, QuoteData, Asset } from './types';
import { FinnhubProvider } from './finnhub';
import { CoinGeckoProvider } from './coingecko';

export class DataManager {
  private providers: DataProvider[] = [];
  private initialized = false;

  constructor() {
    // Don't initialize providers in constructor
    // They will be initialized on first use
  }

  private initializeProviders() {
    // Initialize Finnhub for stocks and futures
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
        baseUrl: 'https://api.coingecko.com/api/v3', // Demo API URL
        rateLimit: {
          requestsPerMinute: 30, // Demo API limit
          requestsPerDay: 10000
        }
      }));
    } else {
      // Add CoinGecko without API key for basic usage (rate limited)
      this.providers.push(new CoinGeckoProvider({
        apiKey: '',
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: {
          requestsPerMinute: 10, // Very limited without API key
          requestsPerDay: 100
        }
      }));
    }

    // Add more providers here as needed
    // if (process.env.POLYGON_API_KEY) {
    //   this.providers.push(new PolygonProvider({...}));
    // }
    // if (process.env.ALPHA_VANTAGE_API_KEY) {
    //   this.providers.push(new AlphaVantageProvider({...}));
    // }
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
    } else {
      // Stock/Futures searches → Finnhub only
      const finnhubProvider = this.providers.find(p => p.name === 'Finnhub');
      if (finnhubProvider) {
        try {
          return await finnhubProvider.searchAssets(query, assetType);
        } catch (error) {
          console.error('Finnhub search failed:', error);
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
    } else {
      // Stock/Futures quotes → Finnhub only
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
    } else {
      // Stock/Futures details → Finnhub only
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
