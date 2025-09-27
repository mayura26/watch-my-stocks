import { DataProvider, SearchResult, QuoteData, Asset, DataProviderConfig } from './types';
import yahooFinance from 'yahoo-finance2';

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

  async isHealthy(): Promise<boolean> {
    try {
      // Test with a simple futures quote
      const testQuote = await yahooFinance.quote('ES=F');
      return testQuote && testQuote.regularMarketPrice !== undefined;
    } catch (error) {
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
