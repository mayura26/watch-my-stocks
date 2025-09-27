import { DataProvider, SearchResult, QuoteData, Asset, DataProviderConfig, HistoricalData } from './types';

export class FinnhubProvider implements DataProvider {
  name = 'Finnhub';
  private config: DataProviderConfig;
  private requestCount = 0;
  private lastReset = Date.now();

  constructor(config: DataProviderConfig) {
    this.config = config;
  }

  async searchAssets(query: string, assetType?: 'stock' | 'crypto' | 'future' | null): Promise<SearchResult[]> {
    try {
      // Only handle stocks and futures - crypto is handled by CoinGecko
      if (assetType === 'crypto') {
        return [];
      }
      
      // For futures, try without the =F suffix first
      if (query.endsWith('=F')) {
        const baseSymbol = query.replace('=F', '');
        const futuresResult = await this.searchWithFallback(baseSymbol);
        if (futuresResult.length > 0) {
          // Convert results to futures format and filter by type
          const futuresResults = futuresResult.map(result => ({
            ...result,
            symbol: result.symbol + '=F',
            type: 'future' as const
          }));
          
          // Filter by asset type if specified
          if (assetType === 'future' || !assetType) {
            return futuresResults;
          } else {
            return []; // If looking for non-futures, return empty
          }
        }
      }

      // Default search for stocks
      const results = await this.searchWithFallback(query);
      
      // Filter results by asset type if specified (exclude crypto)
      if (assetType) {
        return results.filter(result => result.type === assetType);
      }
      
      // Default to stocks and futures only
      return results.filter(result => result.type !== 'crypto');
    } catch (error) {
      console.error('Finnhub search error:', error);
      return [];
    }
  }

  private async searchWithFallback(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/search?q=${encodeURIComponent(query)}&token=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Finnhub search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.result || !Array.isArray(data.result)) {
        return [];
      }

      return data.result
        .slice(0, 10) // Limit to 10 results
        .map((item: any) => ({
          symbol: item.symbol,
          name: item.description || item.symbol,
          type: this.determineAssetType(item.symbol, item.type, item.exchange),
          currency: 'USD',
          exchange: item.exchange || 'NASDAQ'
        }));
    } catch (error) {
      console.error('Finnhub search fallback error:', error);
      return [];
    }
  }

  async getAssetQuote(symbol: string): Promise<QuoteData | null> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&token=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Finnhub quote failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.c || data.c === 0) {
        return null;
      }

      const currentPrice = data.c;
      const previousClose = data.pc || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol,
        currentPrice,
        change,
        changePercent,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Finnhub quote error:', error);
      return null;
    }
  }

  async getAssetDetails(symbol: string): Promise<Asset | null> {
    try {
      // Get quote data
      const quote = await this.getAssetQuote(symbol);
      if (!quote) {
        return null;
      }

      // Get company profile for additional details
      const profileResponse = await fetch(
        `${this.config.baseUrl}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${this.config.apiKey}`
      );

      let name = symbol;
      let exchange = 'NASDAQ';
      let currency = 'USD';

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        name = profile.name || symbol;
        exchange = profile.exchange || 'NASDAQ';
        currency = profile.currency || 'USD';
      }

      return {
        symbol,
        name,
        type: this.determineAssetType(symbol, 'stock', exchange),
        currentPrice: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        currency,
        exchange,
        lastUpdated: quote.lastUpdated
      };
    } catch (error) {
      console.error('Finnhub asset details error:', error);
      return null;
    }
  }

  async getHistoricalData(symbol: string, timeframe: '15m' | '1d'): Promise<HistoricalData[]> {
    try {
      // For now, return mock data since Finnhub's historical data requires a paid plan
      // In a real implementation, you would call the appropriate Finnhub endpoint
      return this.generateMockHistoricalData(symbol, timeframe);
    } catch (error) {
      console.error('Finnhub historical data error:', error);
      return [];
    }
  }

  private generateMockHistoricalData(symbol: string, timeframe: '15m' | '1d'): HistoricalData[] {
    const now = Date.now();
    
    // Define time ranges for different timeframes
    const timeRanges = {
      '15m': {
        interval: 15 * 60 * 1000, // 15 minutes
        dataPoints: 32, // 8 hours (32 * 15min = 8 hours)
        description: 'Last 8 hours'
      },
      '1d': {
        interval: 24 * 60 * 60 * 1000, // 1 day
        dataPoints: 30, // 30 days
        description: 'Last 30 days'
      }
    };
    
    const config = timeRanges[timeframe];
    const interval = config.interval;
    const dataPoints = config.dataPoints;
    
    const data: HistoricalData[] = [];
    let basePrice = 100 + Math.random() * 200; // Random base price between 100-300
    
    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const open = basePrice;
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      data.push({
        timestamp,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });
      
      basePrice = close; // Next candle starts where this one ended
    }
    
    return data;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/quote?symbol=AAPL&token=${this.config.apiKey}`
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }


  private determineAssetType(symbol: string, type?: string, exchange?: string): 'stock' | 'crypto' | 'future' {
    // Use Finnhub's type if available
    if (type) {
      const lowerType = type.toLowerCase();
      if (lowerType.includes('future') || lowerType.includes('futures')) {
        return 'future';
      }
      if (lowerType.includes('equity') || lowerType.includes('stock')) {
        return 'stock';
      }
    }

    // Check exchange for future indicators
    if (exchange) {
      const lowerExchange = exchange.toLowerCase();
      if (lowerExchange.includes('cme') || lowerExchange.includes('cbot') || 
          lowerExchange.includes('nymex') || lowerExchange.includes('comex')) {
        return 'future';
      }
    }

    // Known future symbols patterns
    const futurePatterns = [
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{2}$/, // Standard futures pattern
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{4}$/, // Extended futures pattern
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{2}[FGHJKMNQUVXZ]$/, // Double letter futures
      /^[A-Z]{1,2}=F$/, // Yahoo Finance futures format (ES=F, NQ=F, etc.)
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{2}=F$/ // Extended futures with =F
    ];
    
    const upperSymbol = symbol.toUpperCase();
    if (futurePatterns.some(pattern => pattern.test(upperSymbol))) {
      return 'future';
    }

    // Known futures symbols
    const knownFutures = [
      'ES=F', 'NQ=F', 'YM=F', 'RTY=F', // Equity futures
      'GC=F', 'SI=F', 'PL=F', 'PA=F',  // Precious metals
      'CL=F', 'NG=F', 'RB=F', 'HO=F',  // Energy
      'ZC=F', 'ZS=F', 'ZW=F', 'KC=F',  // Agriculture
      '6E=F', '6J=F', '6B=F', '6A=F'   // Currency futures
    ];
    
    if (knownFutures.includes(upperSymbol)) {
      return 'future';
    }

    // Default to stock for everything else (no crypto handling in Finnhub)
    return 'stock';
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
