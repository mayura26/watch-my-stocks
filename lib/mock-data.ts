export interface Asset {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  type: 'stock' | 'crypto' | 'future';
}

export const mockAssets: Asset[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 150.25,
    change: 2.15,
    changePercent: 1.45,
    type: 'stock'
  },
  {
    id: '2',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    currentPrice: 240.80,
    change: -5.20,
    changePercent: -2.11,
    type: 'stock'
  },
  {
    id: '3',
    symbol: 'BTC',
    name: 'Bitcoin',
    currentPrice: 45123.50,
    change: 1234.75,
    changePercent: 2.82,
    type: 'crypto'
  },
  {
    id: '4',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    currentPrice: 662.27,
    change: 0.64,
    changePercent: 0.10,
    type: 'stock'
  },
  {
    id: '5',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 380.15,
    change: 3.25,
    changePercent: 0.86,
    type: 'stock'
  },
  {
    id: '6',
    symbol: 'ETH',
    name: 'Ethereum',
    currentPrice: 3245.80,
    change: -45.20,
    changePercent: -1.37,
    type: 'crypto'
  }
];
