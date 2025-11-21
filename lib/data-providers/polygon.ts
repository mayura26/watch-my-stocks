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

  async getHistoricalData(symbol: string, timeframe: '1h' | '1d' | '1M' | '1Y'): Promise<HistoricalData[]> {
    try {
      if (!this.config.apiKey) {
        console.warn('Polygon.io API key not configured');
        return [];
      }

      // Calculate date range
      const now = new Date();
      let from: Date;
      let timespan: string;
      let multiplier: number;
      
      if (timeframe === '1h') {
        // Last 1 hour, use 1m intervals for more granular data
        from = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        timespan = 'minute';
        multiplier = 1;
      } else if (timeframe === '1d') {
        // Last 1 day, use 15m intervals
        from = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        timespan = 'minute';
        multiplier = 15;
      } else if (timeframe === '1M') {
        // Last 1 month (30 days), use daily intervals
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        timespan = 'day';
        multiplier = 1;
      } else {
        // Last 1 year (365 days), use daily intervals
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        timespan = 'day';
        multiplier = 1;
      }
      
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
