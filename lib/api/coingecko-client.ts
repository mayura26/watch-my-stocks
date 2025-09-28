import Coingecko from '@coingecko/coingecko-typescript';

// Lazy initialization to ensure environment variables are loaded
let _coingeckoClient: Coingecko | null = null;

export const coingeckoClient = new Proxy({} as Coingecko, {
  get(target, prop) {
    if (!_coingeckoClient) {
      const apiKey = process.env.COINGECKO_API_KEY;
      if (!apiKey) {
        throw new Error('COINGECKO_API_KEY environment variable is not set');
      }
      
      _coingeckoClient = new Coingecko({
        demoAPIKey: apiKey,
        environment: 'demo',
        maxRetries: 3,
      });
      
      console.log('CoinGecko client initialized with API key:', apiKey.substring(0, 10) + '...');
    }
    
    const value = _coingeckoClient[prop as keyof Coingecko];
    return typeof value === 'function' ? value.bind(_coingeckoClient) : value;
  }
});

export default coingeckoClient;
