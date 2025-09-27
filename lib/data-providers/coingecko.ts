import { DataProvider, SearchResult, QuoteData, Asset, DataProviderConfig } from './types';

export class CoinGeckoProvider implements DataProvider {
  name = 'CoinGecko';
  private config: DataProviderConfig;
  private requestCount = 0;
  private lastReset = Date.now();
  private coinIdCache = new Map<string, string>(); // Cache for symbol -> coin ID mapping

  constructor(config: DataProviderConfig) {
    this.config = config;
  }

  async searchAssets(query: string, assetType?: 'stock' | 'crypto' | 'future' | null): Promise<SearchResult[]> {
    // Only handle crypto searches
    if (assetType && assetType !== 'crypto') {
      return [];
    }

    try {
      const upperQuery = query.toUpperCase().trim();
      
      // For crypto searches, use CoinGecko's search endpoint
      const response = await fetch(
        this.getApiUrl(`/search?query=${encodeURIComponent(upperQuery)}`),
        {
          headers: this.getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.coins || !Array.isArray(data.coins)) {
        return [];
      }

      // Map CoinGecko results to our SearchResult format, including coin ID for quotes
      const mappedResults = data.coins
        .slice(0, 15) // Get more results initially
        .map((coin: any) => ({
          symbol: coin.symbol?.toUpperCase() || '',
          name: coin.name || '',
          type: 'crypto' as const,
          currency: 'USD',
          exchange: 'CRYPTO',
          coinId: coin.id // Store the coin ID for efficient quote fetching
        }))
        .filter((result: SearchResult & { coinId?: string }) => result.symbol && result.name);

      // Deduplicate by symbol and name combination, then limit to 10
      const uniqueResults = mappedResults.filter((result: SearchResult & { coinId?: string }, index: number, array: (SearchResult & { coinId?: string })[]) => 
        array.findIndex(r => r.symbol === result.symbol && r.name === result.name) === index
      );

      // Remove coinId from final results (it's only needed internally)
      return uniqueResults.slice(0, 10).map(({ coinId: _coinId, ...result }: SearchResult & { coinId?: string }) => result);
        
    } catch (error) {
      console.error('CoinGecko search error:', error);
      return [];
    }
  }

  async getAssetQuote(symbol: string): Promise<QuoteData | null> {
    try {
      // CoinGecko uses coin IDs, not symbols, so we need to find the coin ID first
      const coinId = await this.getCoinId(symbol);
      if (!coinId) {
        return null;
      }

      const response = await fetch(
        this.getApiUrl(`/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`),
        {
          headers: this.getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko quote failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data[coinId]) {
        return null;
      }

      const coinData = data[coinId];
      const currentPrice = coinData.usd || 0;
      const changePercent = coinData.usd_24h_change || 0;
      const change = (currentPrice * changePercent) / 100;

      return {
        symbol: symbol.toUpperCase(),
        currentPrice,
        change,
        changePercent,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('CoinGecko quote error:', error);
      return null;
    }
  }

  async getAssetDetails(symbol: string): Promise<Asset | null> {
    try {
      // Get quote data first
      const quote = await this.getAssetQuote(symbol);
      if (!quote) {
        return null;
      }

      // Get additional details from CoinGecko
      const coinId = await this.getCoinId(symbol);
      if (!coinId) {
        return null;
      }

      const response = await fetch(
        this.getApiUrl(`/coins/${coinId}`),
        {
          headers: this.getHeaders()
        }
      );

      if (!response.ok) {
        // If detailed info fails, return basic info from quote
        return {
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          type: 'crypto',
          currentPrice: quote.currentPrice,
          change: quote.change,
          changePercent: quote.changePercent,
          currency: 'USD',
          exchange: 'CRYPTO',
          lastUpdated: quote.lastUpdated
        };
      }

      const data = await response.json();

      return {
        symbol: symbol.toUpperCase(),
        name: data.name || symbol.toUpperCase(),
        type: 'crypto',
        currentPrice: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        currency: 'USD',
        exchange: 'CRYPTO',
        lastUpdated: quote.lastUpdated
      };
    } catch (error) {
      console.error('CoinGecko asset details error:', error);
      return null;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(
        this.getApiUrl('/ping'),
        {
          headers: this.getHeaders()
        }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async getCoinId(symbol: string): Promise<string | null> {
    try {
      // Check cache first
      const upperSymbol = symbol.toUpperCase();
      if (this.coinIdCache.has(upperSymbol)) {
        return this.coinIdCache.get(upperSymbol) || null;
      }

      // For common cryptocurrencies, use known coin IDs to avoid API calls
      // Use native CoinGecko symbols (no -USD suffix needed)
      const commonCoins: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'ADA': 'cardano',
        'DOT': 'polkadot',
        'LINK': 'chainlink',
        'LTC': 'litecoin',
        'BCH': 'bitcoin-cash',
        'XRP': 'ripple',
        'XLM': 'stellar',
        'EOS': 'eos',
        'TRX': 'tron',
        'BNB': 'binancecoin',
        'AVAX': 'avalanche-2',
        'MATIC': 'matic-network',
        'ATOM': 'cosmos',
        'ALGO': 'algorand',
        'VET': 'vechain',
        'DOGE': 'dogecoin',
        'SHIB': 'shiba-inu',
        'UNI': 'uniswap',
        'AAVE': 'aave',
        'COMP': 'compound-governance-token',
        'MKR': 'maker',
        'SNX': 'havven'
      };

      if (commonCoins[upperSymbol]) {
        const coinId = commonCoins[upperSymbol];
        this.coinIdCache.set(upperSymbol, coinId);
        return coinId;
      }

      // Fallback to API call for less common coins (but this hits rate limits)
      console.warn(`Coin ID not cached for ${symbol}, API call may hit rate limits`);
      return null;
    } catch (error) {
      console.error('CoinGecko getCoinId error:', error);
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Add API key if available (CoinGecko uses x-cg-demo-api-key for demo API)
    if (this.config.apiKey) {
      headers['x-cg-demo-api-key'] = this.config.apiKey;
    }

    return headers;
  }

  private getApiUrl(endpoint: string): string {
    // For demo API, we can also pass the API key as a query parameter
    const baseUrl = this.config.baseUrl;
    if (this.config.apiKey) {
      const separator = endpoint.includes('?') ? '&' : '?';
      return `${baseUrl}${endpoint}${separator}x_cg_demo_api_key=${this.config.apiKey}`;
    }
    return `${baseUrl}${endpoint}`;
  }

  // Get attribution information as required by CoinGecko
  getAttribution(): { text: string; logoUrl: string; linkUrl: string } {
    return {
      text: 'Data provided by CoinGecko',
      logoUrl: 'https://static.coingecko.com/s/coingecko-logo.png',
      linkUrl: 'https://www.coingecko.com/en/api'
    };
  }

  private async checkRateLimit(): Promise<boolean> {
    const now = Date.now();
    const timeDiff = now - this.lastReset;
    
    // Reset counter every minute
    if (timeDiff > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    
    // Check if we're within rate limits
    if (this.requestCount >= this.config.rateLimit.requestsPerMinute) {
      return false;
    }
    
    this.requestCount++;
    return true;
  }
}
