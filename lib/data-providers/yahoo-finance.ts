import { DataProvider, SearchResult, QuoteData, Asset, DataProviderConfig, HistoricalData } from './types';
import yahooFinance from 'yahoo-finance2';

// Suppress Yahoo Finance notices
yahooFinance.suppressNotices(['ripHistorical', 'yahooSurvey']);

export class YahooFinanceProvider implements DataProvider {
  name = 'YahooFinance';
  private config: DataProviderConfig;

  constructor(config: DataProviderConfig) {
    this.config = config;
  }

  async searchAssets(query: string, assetType?: 'stock' | 'crypto' | 'future' | null): Promise<SearchResult[]> {
    // Only handle futures searches
    if (assetType && assetType !== 'future') {
      return [];
    }

    try {
      const upperQuery = query.toUpperCase().trim();
      
      // For futures, we'll search for common futures symbols
      const futuresMatches = this.getFuturesMatches(upperQuery);
      
      if (futuresMatches.length > 0) {
        return futuresMatches;
      }

      // Try searching with =F suffix for Yahoo Finance futures format
      if (!query.endsWith('=F')) {
        const futuresQuery = query + '=F';
        const futuresResults = await this.searchWithYahooFinance(futuresQuery);
        if (futuresResults.length > 0) {
          return futuresResults;
        }
      }

      // Try direct search
      return await this.searchWithYahooFinance(query);
    } catch (error) {
      console.error('Yahoo Finance search error:', error);
      return [];
    }
  }

  private async searchWithYahooFinance(query: string): Promise<SearchResult[]> {
    try {
      // Use yahoo-finance2 search functionality
      const searchResults = await yahooFinance.search(query, {
        newsCount: 0,
        quotesCount: 10
      });

      if (!searchResults.quotes || !Array.isArray(searchResults.quotes)) {
        return [];
      }

      return searchResults.quotes
        .filter((quote: any) => quote.symbol && quote.shortName)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          type: this.determineAssetType(quote.symbol, quote.quoteType),
          currency: quote.currency || 'USD',
          exchange: quote.exchange || 'FUTURES'
        }))
        .filter((result: SearchResult) => result.type === 'future')
        .slice(0, 10);
    } catch (error) {
      console.error('Yahoo Finance search API error:', error);
      return [];
    }
  }

  private getFuturesMatches(query: string): SearchResult[] {
    // Define common futures symbols and their patterns
    const futuresDatabase = [
      // Equity futures
      { symbol: 'ES=F', name: 'E-mini S&P 500', searchTerms: ['ES', 'SP500', 'SPX', 'S&P'] },
      { symbol: 'NQ=F', name: 'E-mini NASDAQ-100', searchTerms: ['NQ', 'NASDAQ', 'QQQ'] },
      { symbol: 'YM=F', name: 'E-mini Dow Jones', searchTerms: ['YM', 'DOW', 'DIA'] },
      { symbol: 'RTY=F', name: 'E-mini Russell 2000', searchTerms: ['RTY', 'RUSSELL', 'RUT'] },
      
      // Precious metals
      { symbol: 'GC=F', name: 'Gold Futures', searchTerms: ['GC', 'GOLD'] },
      { symbol: 'SI=F', name: 'Silver Futures', searchTerms: ['SI', 'SILVER'] },
      { symbol: 'PL=F', name: 'Platinum Futures', searchTerms: ['PL', 'PLATINUM'] },
      { symbol: 'PA=F', name: 'Palladium Futures', searchTerms: ['PA', 'PALLADIUM'] },
      
      // Energy
      { symbol: 'CL=F', name: 'Crude Oil Futures', searchTerms: ['CL', 'OIL', 'CRUDE', 'WTI'] },
      { symbol: 'NG=F', name: 'Natural Gas Futures', searchTerms: ['NG', 'NATGAS', 'NATURAL GAS'] },
      { symbol: 'RB=F', name: 'Gasoline Futures', searchTerms: ['RB', 'GASOLINE'] },
      { symbol: 'HO=F', name: 'Heating Oil Futures', searchTerms: ['HO', 'HEATING OIL'] },
      
      // Agriculture
      { symbol: 'ZC=F', name: 'Corn Futures', searchTerms: ['ZC', 'CORN'] },
      { symbol: 'ZS=F', name: 'Soybean Futures', searchTerms: ['ZS', 'SOYBEAN', 'SOY'] },
      { symbol: 'ZW=F', name: 'Wheat Futures', searchTerms: ['ZW', 'WHEAT'] },
      { symbol: 'KC=F', name: 'Coffee Futures', searchTerms: ['KC', 'COFFEE'] },
      { symbol: 'CC=F', name: 'Cocoa Futures', searchTerms: ['CC', 'COCOA'] },
      { symbol: 'SB=F', name: 'Sugar Futures', searchTerms: ['SB', 'SUGAR'] },
      
      // Currency futures
      { symbol: '6E=F', name: 'Euro Futures', searchTerms: ['6E', 'EUR', 'EURO'] },
      { symbol: '6J=F', name: 'Japanese Yen Futures', searchTerms: ['6J', 'JPY', 'YEN'] },
      { symbol: '6B=F', name: 'British Pound Futures', searchTerms: ['6B', 'GBP', 'POUND'] },
      { symbol: '6A=F', name: 'Australian Dollar Futures', searchTerms: ['6A', 'AUD', 'AUSSIE'] },
      { symbol: '6C=F', name: 'Canadian Dollar Futures', searchTerms: ['6C', 'CAD', 'CANADIAN'] },
      
      // Bonds
      { symbol: 'ZB=F', name: '30-Year Treasury Bond', searchTerms: ['ZB', 'BOND', 'TREASURY'] },
      { symbol: 'ZN=F', name: '10-Year Treasury Note', searchTerms: ['ZN', 'NOTE', 'TNOTE'] },
      { symbol: 'ZF=F', name: '5-Year Treasury Note', searchTerms: ['ZF', 'FIVE YEAR'] },
      { symbol: 'ZT=F', name: '2-Year Treasury Note', searchTerms: ['ZT', 'TWO YEAR'] }
    ];

    const matches: SearchResult[] = [];
    
    for (const future of futuresDatabase) {
      // Check if query matches any search terms or the symbol
      const isMatch = future.searchTerms.some(term => 
        term.toUpperCase().includes(query) || 
        query.includes(term.toUpperCase()) ||
        future.symbol.toUpperCase().includes(query) ||
        query.includes(future.symbol.toUpperCase())
      );
      
      if (isMatch) {
        matches.push({
          symbol: future.symbol,
          name: future.name,
          type: 'future',
          currency: 'USD',
          exchange: 'CME'
        });
      }
    }
    
    return matches.slice(0, 10);
  }

  private determineAssetType(symbol: string, quoteType?: string): 'stock' | 'crypto' | 'future' {
    // Check quote type first
    if (quoteType) {
      const lowerType = quoteType.toLowerCase();
      if (lowerType.includes('future') || lowerType.includes('futures')) {
        return 'future';
      }
    }

    // Check symbol patterns for futures
    const upperSymbol = symbol.toUpperCase();
    
    // Yahoo Finance futures typically end with =F
    if (upperSymbol.endsWith('=F')) {
      return 'future';
    }
    
    // Known futures patterns
    const futurePatterns = [
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{2}$/, // Standard futures pattern
      /^[A-Z]{1,2}[FGHJKMNQUVXZ]\d{4}$/, // Extended futures pattern
      /^6[A-Z]=F$/, // Currency futures
      /^[A-Z]{2}=F$/ // Other futures
    ];
    
    if (futurePatterns.some(pattern => pattern.test(upperSymbol))) {
      return 'future';
    }

    // Default to future for Yahoo Finance provider since it's futures-focused
    return 'future';
  }

  async getAssetQuote(symbol: string): Promise<QuoteData | null> {
    try {
      // Ensure symbol has =F suffix for Yahoo Finance futures
      const futuresSymbol = symbol.endsWith('=F') ? symbol : symbol + '=F';
      
      const quote = await yahooFinance.quote(futuresSymbol);
      
      if (!quote || !quote.regularMarketPrice) {
        return null;
      }

      const currentPrice = quote.regularMarketPrice;
      const previousClose = quote.regularMarketPreviousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: futuresSymbol,
        currentPrice,
        change,
        changePercent,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Yahoo Finance quote error:', error);
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

      // Get additional details from Yahoo Finance
      const futuresSymbol = symbol.endsWith('=F') ? symbol : symbol + '=F';
      const quoteDetails = await yahooFinance.quote(futuresSymbol);

      return {
        symbol: futuresSymbol,
        name: quoteDetails.longName || quoteDetails.shortName || futuresSymbol,
        type: 'future',
        currentPrice: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        currency: quoteDetails.currency || 'USD',
        exchange: quoteDetails.exchange || 'CME',
        lastUpdated: quote.lastUpdated
      };
    } catch (error) {
      console.error('Yahoo Finance asset details error:', error);
      return null;
    }
  }

  async getHistoricalData(symbol: string, timeframe: '15m' | '1d'): Promise<HistoricalData[]> {
    try {
      // Use yahoo-finance2 for real historical data
      const now = new Date();
      let period1: Date;
      let period2: Date = now;

      if (timeframe === '15m') {
        // For 15m data, always pull from the last valid trading point (5pm close) backwards
        // This ensures we get consistent data regardless of current time or market status
        const isFutures = symbol.endsWith('=F');
        const currentTimeET = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const currentDay = currentTimeET.getDay(); // 0 = Sunday, 6 = Saturday
        const hourET = currentTimeET.getHours();
        
        if (isFutures) {
          // For futures, find the last valid 5pm ET close
          let lastValidClose: Date;
          
          if (currentDay === 0 && hourET < 18) {
            // Sunday before 6PM ET - use Friday's 5PM ET close
            lastValidClose = new Date(currentTimeET);
            lastValidClose.setDate(currentTimeET.getDate() - 2); // Go back to Friday
            lastValidClose.setHours(17, 0, 0, 0); // 5PM ET
          } else if (currentDay === 6 && hourET >= 17) {
            // Saturday after 5PM ET - use Friday's 5PM ET close
            lastValidClose = new Date(currentTimeET);
            lastValidClose.setDate(currentTimeET.getDate() - 1); // Go back to Friday
            lastValidClose.setHours(17, 0, 0, 0); // 5PM ET
          } else {
            // Market is open or during trading hours - use current day's 5PM ET (if past) or previous day's 5PM ET
            if (hourET >= 17) {
              // Past 5PM ET today
              lastValidClose = new Date(currentTimeET);
              lastValidClose.setHours(17, 0, 0, 0); // 5PM ET today
            } else {
              // Before 5PM ET today - use previous trading day's 5PM ET
              const prevTradingDay = new Date(currentTimeET);
              if (currentDay === 1) { // Monday
                prevTradingDay.setDate(currentTimeET.getDate() - 3); // Go back to Friday
              } else {
                prevTradingDay.setDate(currentTimeET.getDate() - 1); // Previous day
              }
              lastValidClose = new Date(prevTradingDay);
              lastValidClose.setHours(17, 0, 0, 0); // 5PM ET
            }
          }
          
          console.log(`Yahoo Finance: Using last valid close (${lastValidClose.toISOString()}) for ${symbol} 15m data`);
          
          // Pull 8 hours of 15m data backwards from the last valid close
          period1 = new Date(lastValidClose.getTime() - 8 * 60 * 60 * 1000); // 8 hours before close
          period2 = lastValidClose;
        } else {
          // For non-futures (stocks), use regular market hours logic
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
          
          console.log(`Yahoo Finance: Using last valid close (${lastValidClose.toISOString()}) for ${symbol} 15m data`);
          
          // Pull 8 hours of 15m data backwards from the last valid close
          period1 = new Date(lastValidClose.getTime() - 8 * 60 * 60 * 1000); // 8 hours before close
          period2 = lastValidClose;
        }
      } else {
        // For 1d data, use 30-day lookback
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      // Use chart() method for all timeframes since historical() is deprecated
      console.log(`Yahoo Finance: Using chart() method for ${symbol} ${timeframe}`);
      console.log(`Yahoo Finance: Period1: ${period1.toISOString()}, Period2: ${period2.toISOString()}, Interval: ${timeframe === '15m' ? '15m' : '1d'}`);
      
      const result = await yahooFinance.chart(symbol, {
        period1,
        period2,
        interval: timeframe === '15m' ? '15m' : '1d'
      });
      console.log(`Yahoo Finance: Chart result:`, result ? 'success' : 'null', result?.quotes?.length || 0, 'quotes');

      if (!result || !result.quotes || result.quotes.length === 0) {
        console.warn(`No historical data found for ${symbol}`);
        return [];
      }

      // Convert yahoo-finance2 chart() format to our HistoricalData format
      // chart() returns { quotes: [...] } format
      const quotes = result.quotes || [];
      if (quotes.length === 0) {
        console.warn(`No quotes found in chart result for ${symbol}`);
        return [];
      }
      
      return quotes.map((item: any) => ({
        timestamp: new Date(item.date).getTime(),
        open: item.open || 0,
        high: item.high || 0,
        low: item.low || 0,
        close: item.close || 0,
        volume: item.volume || 0
      })).sort((a: any, b: any) => a.timestamp - b.timestamp);

    } catch (error) {
      console.error('Yahoo Finance historical data error:', error);
      
      // If it's a consent or rate limit error, throw it for better error handling
      if (error instanceof Error && (
        error.message.includes('consent') ||
        error.message.includes('rate limit') ||
        error.message.includes('429')
      )) {
        throw error;
      }
      
      return [];
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test with a simple futures quote
      const testQuote = await yahooFinance.quote('ES=F');
      return testQuote && testQuote.regularMarketPrice !== undefined;
    } catch {
      return false;
    }
  }

  // Yahoo Finance doesn't require attribution, but we can add a note
  getAttribution(): { text: string; logoUrl: string; linkUrl: string } {
    return {
      text: 'Futures data provided by Yahoo Finance',
      logoUrl: 'https://finance.yahoo.com/favicon.ico',
      linkUrl: 'https://finance.yahoo.com'
    };
  }
}
