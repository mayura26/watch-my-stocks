import { DataProvider, SearchResult, QuoteData, Asset, DataProviderConfig, HistoricalData } from './types';
import { coingeckoClient } from '../api/coingecko-client';

export class CoinGeckoProvider implements DataProvider {
  name = 'CoinGecko';
  private config: DataProviderConfig;
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
      const data = await coingeckoClient.search.get({
        query: query.trim(),
      });
      
      if (!data.coins || !Array.isArray(data.coins)) {
        return [];
      }

      // Map CoinGecko results to our SearchResult format
      const mappedResults = data.coins
        .slice(0, 15) // Get more results initially
        .map((coin) => ({
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

      // Include coinId in final results for crypto assets
      return uniqueResults.slice(0, 10).map((item: SearchResult & { coinId?: string }) => ({
        symbol: item.symbol,
        name: item.name,
        type: item.type,
        currency: item.currency,
        exchange: item.exchange,
        coinId: item.coinId // Include coinId for crypto assets
      }));

    } catch (err) {
      console.error('CoinGecko search error:', err);
      return [];
    }
  }

  async getAssetQuote(symbol: string): Promise<QuoteData | null> {
    try {
      // Get coin ID for the symbol
      const coinId = await this.getCoinId(symbol);
      if (!coinId) {
        console.warn(`CoinGecko: No coin ID found for ${symbol}`);
        return null;
      }

      const data = await coingeckoClient.simple.price.get({
        ids: coinId,
        vs_currencies: 'usd',
        include_24hr_change: true,
      });
      
      if (!data[coinId]) {
        console.warn(`CoinGecko: No price data for ${symbol} (${coinId})`);
        return null;
      }

      const priceData = data[coinId];
      const currentPrice = priceData.usd || 0;
      const change24h = priceData.usd_24h_change || 0;
      const changePercent = change24h;
      const change = (currentPrice * changePercent) / 100;

      return {
        symbol: symbol.toUpperCase(),
        currentPrice,
        change,
        changePercent,
        lastUpdated: new Date()
      };

    } catch (err) {
      console.error('CoinGecko quote error:', err);
      return null;
    }
  }

  async getAssetDetails(symbol: string): Promise<Asset | null> {
    try {
      // Get coin ID for the symbol
      const coinId = await this.getCoinId(symbol);
      if (!coinId) {
        console.warn(`CoinGecko: No coin ID found for ${symbol}`);
        return null;
      }

      // For now, skip the detailed asset info since coins.id method doesn't exist in SDK
      // We can get basic info from the price data
      const priceData = await coingeckoClient.simple.price.get({
        ids: coinId,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true,
        include_24hr_vol: true,
      });
      
      if (!priceData[coinId]) {
        console.warn(`CoinGecko: No asset details for ${symbol} (${coinId})`);
        return null;
      }

      const data = priceData[coinId];
      
      if (!data) {
        console.warn(`CoinGecko: No asset details for ${symbol} (${coinId})`);
        return null;
      }

      const currentPrice = data.usd || 0;
      const change24h = data.usd_24h_change || 0;
      const change = (currentPrice * change24h) / 100;

      return {
        symbol: symbol.toUpperCase(),
        name: symbol, // We don't have the full name from simple price endpoint
        currentPrice,
        change,
        changePercent: change24h,
        type: 'crypto',
        lastUpdated: new Date()
      };

    } catch (err) {
      console.error('CoinGecko asset details error:', err);
      return null;
    }
  }

  async getHistoricalData(symbol: string, timeframe: '15m' | '1d', coinId?: string): Promise<HistoricalData[]> {
    try {
      // coinId should always be provided for crypto assets
      if (!coinId) {
        console.warn(`CoinGecko: No coin ID provided for ${symbol}. This should not happen for crypto assets.`);
        return [];
      }

      // Calculate date range based on timeframe
      const days = timeframe === '15m' ? 1 : 30;

      console.log(`CoinGecko: Getting historical data for ${symbol}, coinId: ${coinId}, timeframe: ${timeframe}, days: ${days}`);
      
      // Use the OHLC endpoint which provides proper OHLC data
      // Correct SDK method: coingeckoClient.coins.ohlc.get(id, params)
      const data = await coingeckoClient.coins.ohlc.get(coinId, {
        vs_currency: 'usd',
        days: days.toString() as '1' | '7' | '14' | '30' | '90' | '180' | '365' | 'max',
      });

      if (!data || !Array.isArray(data)) {
        console.warn(`CoinGecko: No historical data for ${symbol}`);
        return [];
      }

      // Convert OHLC format to our HistoricalData format
      // OHLC returns: [timestamp, open, high, low, close]
      const historicalData: HistoricalData[] = [];

      console.log(`CoinGecko: Processing ${data.length} OHLC data points`);

      for (let i = 0; i < data.length; i++) {
        const ohlcData = data[i];
        
        if (!ohlcData || ohlcData.length < 5) continue;

        let timestamp = ohlcData[0];
        const open = ohlcData[1];
        const high = ohlcData[2];
        const low = ohlcData[3];
        const close = ohlcData[4];

        // Check if timestamp is in seconds instead of milliseconds
        // If timestamp is less than year 2000 in milliseconds, it's likely in seconds
        if (timestamp < 946684800000) { // Jan 1, 2000 in milliseconds
          timestamp = timestamp * 1000; // Convert seconds to milliseconds
        }

        // Log first few data points for debugging
        if (i < 3) {
          const date = new Date(timestamp);
          const currentTime = Date.now();
          console.log(`Data point ${i}:`, { 
            originalTimestamp: ohlcData[0],
            convertedTimestamp: timestamp, 
            date: date.toISOString(),
            currentTime: new Date(currentTime).toISOString(),
            isFuture: timestamp > currentTime,
            open, high, low, close 
          });
        }

        // Use the converted timestamp
        historicalData.push({
          timestamp: timestamp,
          open: open,
          high: high,
          low: low,
          close: close,
          volume: 0 // OHLC endpoint doesn't provide volume data
        });
      }

      // Log last few data points for debugging
      if (historicalData.length > 0) {
        const lastIndex = historicalData.length - 1;
        const lastData = historicalData[lastIndex];
        const lastDate = new Date(lastData.timestamp);
        console.log(`Last data point:`, { 
          timestamp: lastData.timestamp, 
          date: lastDate.toISOString(),
          open: lastData.open,
          close: lastData.close
        });
      }

      console.log(`CoinGecko: Retrieved ${historicalData.length} historical data points for ${symbol}`);
      return historicalData;

    } catch (err) {
      console.error('CoinGecko historical data error:', err);
      return [];
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Use the ping endpoint to check if the service is available
      await coingeckoClient.ping.get();
      return true;
    } catch (err) {
      console.error('CoinGecko health check error:', err);
      return false;
    }
  }

  getAttribution(): { text: string; logoUrl: string; linkUrl: string } {
    return {
      text: 'Data provided by CoinGecko',
      logoUrl: 'https://static.coingecko.com/s/coingecko-logo-d13d92bcc0f0034f7b494277381ebca955bed4185f5266b61edabbc044a61a31.png',
      linkUrl: 'https://www.coingecko.com/'
    };
  }

  private async getCoinId(symbol: string): Promise<string | null> {
    const upperSymbol = symbol.toUpperCase();
    
    // Check cache first
    if (this.coinIdCache.has(upperSymbol)) {
      return this.coinIdCache.get(upperSymbol) || null;
    }

    // Common coins with their CoinGecko IDs
    const commonCoins: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'ATOM': 'cosmos',
      'FTM': 'fantom',
      'NEAR': 'near',
      'ALGO': 'algorand',
      'VET': 'vechain',
      'ICP': 'internet-computer',
      'XRP': 'ripple',
      'FIL': 'filecoin',
      'TRX': 'tron',
      'ETC': 'ethereum-classic',
      'XLM': 'stellar',
      'HBAR': 'hedera-hashgraph',
      'APT': 'aptos',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'SUI': 'sui',
      'SEI': 'sei-network',
      'TIA': 'celestia',
      'INJ': 'injective-protocol',
      'JUP': 'jupiter-exchange-solana',
      'WIF': 'dogwifcoin',
      'BONK': 'bonk',
      'PEPE': 'pepe',
      'DOGE': 'dogecoin',
      'SHIB': 'shiba-inu'
    };

    // Check common coins first
    if (commonCoins[upperSymbol]) {
      this.coinIdCache.set(upperSymbol, commonCoins[upperSymbol]);
      return commonCoins[upperSymbol];
    }

    // If not found in common coins, try to search for it via API
    try {
      console.log(`CoinGecko: Searching for ${symbol} via API...`);
      const searchResults = await coingeckoClient.search.get({
        query: symbol,
      });
      
      if (searchResults.coins && searchResults.coins.length > 0) {
        // Find exact symbol match (case insensitive)
        const exactMatch = searchResults.coins.find(coin => 
          coin.symbol?.toUpperCase() === upperSymbol
        );
        
        if (exactMatch) {
          const coinId = String(exactMatch.id);
          console.log(`CoinGecko: Found ${symbol} -> ${coinId}`);
          this.coinIdCache.set(upperSymbol, coinId);
          return coinId;
        }
        
        // If no exact match, use the first result
        const firstResult = searchResults.coins[0];
        const coinId = String(firstResult.id);
        console.log(`CoinGecko: Using first result for ${symbol} -> ${coinId}`);
        this.coinIdCache.set(upperSymbol, coinId);
        return coinId;
      }
    } catch (error) {
      console.warn(`CoinGecko: Search failed for ${symbol}:`, error instanceof Error ? error.message : String(error));
    }
    
    console.warn(`Coin ID not found for ${symbol}`);
    return null;
  }
}
