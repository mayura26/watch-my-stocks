import { DataProvider, SearchResult, QuoteData, Asset, HistoricalData } from './types';

interface PolygonProviderConfig {
  apiKey: string;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

export class PolygonProvider implements DataProvider {
  name = 'Polygon.io';
  private config: PolygonProviderConfig;

  constructor(config: PolygonProviderConfig) {
    this.config = config;
  }

  async searchAssets(query: string, assetType?: 'stock' | 'crypto' | 'future' | null): Promise<SearchResult[]> {
    try {
      if (!this.config.apiKey) {
        console.warn('Polygon.io API key not configured');
        return [];
      }

      // Only search for stocks
      if (assetType && assetType !== 'stock') {
        return [];
      }

      const response = await fetch(
        `${this.config.baseUrl}/v3/reference/tickers?search=${encodeURIComponent(query)}&market=stocks&active=true&limit=10&apikey=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Polygon.io search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return [];
      }

      return data.results.map((ticker: any) => ({
        symbol: ticker.ticker,
        name: ticker.name || ticker.ticker,
        type: 'stock' as const,
        exchange: ticker.primary_exchange || 'Unknown',
        currency: ticker.currency_name || 'USD'
      }));

    } catch (error) {
      console.error('Polygon.io search error:', error);
      return [];
    }
  }

  async getAssetQuote(symbol: string): Promise<QuoteData | null> {
    try {
      if (!this.config.apiKey) {
        console.warn('Polygon.io API key not configured');
        return null;
      }

      const response = await fetch(
        `${this.config.baseUrl}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Polygon.io quote failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const currentPrice = result.c; // close price
      const previousClose = result.o; // open price (previous close)
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol,
        currentPrice,
        change,
        changePercent,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Polygon.io quote error:', error);
      return null;
    }
  }

  async getAssetDetails(symbol: string): Promise<Asset | null> {
    try {
      if (!this.config.apiKey) {
        console.warn('Polygon.io API key not configured');
        return null;
      }

      // Get ticker details
      const detailsResponse = await fetch(
        `${this.config.baseUrl}/v3/reference/tickers/${symbol}?apikey=${this.config.apiKey}`
      );

      if (!detailsResponse.ok) {
        throw new Error(`Polygon.io details failed: ${detailsResponse.status}`);
      }

      const detailsData = await detailsResponse.json();
      const ticker = detailsData.results;

      if (!ticker) {
        return null;
      }

      // Get current quote
      const quote = await this.getAssetQuote(symbol);
      if (!quote) {
        return null;
      }

      return {
        symbol,
        name: ticker.name || ticker.ticker,
        type: 'stock',
        currentPrice: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        currency: ticker.currency_name || 'USD',
        exchange: ticker.primary_exchange || 'Unknown',
        lastUpdated: quote.lastUpdated
      };

    } catch (error) {
      console.error('Polygon.io asset details error:', error);
      return null;
    }
  }

  async getHistoricalData(symbol: string, timeframe: '15m' | '1d'): Promise<HistoricalData[]> {
    try {
      if (!this.config.apiKey) {
        console.warn('Polygon.io API key not configured');
        return [];
      }

      // Calculate date range
      const now = new Date();
      let from: Date;
      
      if (timeframe === '15m') {
        // For 15m data, pull from the last valid trading point (4pm close) backwards
        const currentTimeET = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const currentDay = currentTimeET.getDay(); // 0 = Sunday, 6 = Saturday
        const hourET = currentTimeET.getHours();
        
        // Find the last valid 4PM ET close (regular market close)
        const lastValidClose = new Date(currentTimeET);
        
        if (currentDay === 0 || currentDay === 6) {
          // Weekend - use Friday's 4PM ET close
          lastValidClose.setDate(currentTimeET.getDate() - (currentDay === 0 ? 2 : 1)); // Go back to Friday
          lastValidClose.setHours(16, 0, 0, 0); // 4PM ET
        } else {
          // Weekday - use today's 4PM ET (if past) or previous day's 4PM ET
          if (hourET >= 16) {
            // Past 4PM ET today
            lastValidClose.setHours(16, 0, 0, 0); // 4PM ET today
          } else {
            // Before 4PM ET today - use previous trading day's 4PM ET
            if (currentDay === 1) { // Monday
              lastValidClose.setDate(currentTimeET.getDate() - 3); // Go back to Friday
            } else {
              lastValidClose.setDate(currentTimeET.getDate() - 1); // Previous day
            }
            lastValidClose.setHours(16, 0, 0, 0); // 4PM ET
          }
        }
        
        
        // Pull 8 hours of 15m data backwards from the last valid close
        from = new Date(lastValidClose.getTime() - 8 * 60 * 60 * 1000); // 8 hours before close
      } else {
        // For 1d data, use 30-day lookback
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      const timespan = timeframe === '15m' ? 'minute' : 'day';
      const multiplier = timeframe === '15m' ? 15 : 1;
      
      const response = await fetch(
        `${this.config.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from.toISOString().split('T')[0]}/${now.toISOString().split('T')[0]}?adjusted=true&sort=asc&apikey=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Polygon.io historical data failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return [];
      }

      // Convert Polygon.io format to our HistoricalData format
      return data.results.map((item: any) => ({
        timestamp: item.t,
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v
      }));

    } catch (error) {
      console.error('Polygon.io historical data error:', error);
      
      // If it's a rate limit error, throw it for better error handling
      if (error instanceof Error && (
        error.message.includes('rate limit') ||
        error.message.includes('429') ||
        error.message.includes('quota')
      )) {
        throw error;
      }
      
      return [];
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        return false;
      }

      // Test with a simple stock quote
      const testQuote = await this.getAssetQuote('AAPL');
      return testQuote !== null;
    } catch {
      return false;
    }
  }

  getAttribution(): { text: string; logoUrl: string; linkUrl: string } {
    return {
      text: 'Stock data provided by Polygon.io',
      logoUrl: 'https://polygon.io/favicon.ico',
      linkUrl: 'https://polygon.io'
    };
  }
}
