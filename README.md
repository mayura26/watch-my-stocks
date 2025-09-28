# Watch My Stocks

A modern stock, crypto, and futures portfolio tracking application built with Next.js.

## Features

- **Asset Discovery**: Search for stocks, cryptocurrencies, and futures with type filtering
- **Real-time Data**: Live price updates and market data
- **Portfolio Management**: Track your investments across different asset types
- **Alerts & Notifications**: Set price alerts and get notified of market movements
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark/Light Theme**: Automatic theme switching with system preference detection

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Database (Turso recommended)
- API keys for data providers

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Database Configuration
TURSO_DATABASE_URL=your_turso_database_url_here
TURSO_AUTH_TOKEN=your_turso_auth_token_here

# Data Provider API Keys
FINNHUB_API_KEY=your_finnhub_api_key_here
COINGECKO_API_KEY=your_coingecko_demo_api_key_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Additional API Keys (optional)
POLYGON_API_KEY=your_polygon_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

### Getting API Keys

#### Finnhub (Stocks)
1. Visit [finnhub.io](https://finnhub.io)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env.local` file as `FINNHUB_API_KEY`

**Note**: Finnhub's free tier provides real-time quotes and search for stocks. Historical OHLC data is provided via Yahoo Finance (free) to avoid requiring a paid Finnhub subscription.

#### CoinGecko (Cryptocurrency Data)
1. Visit [CoinGecko API](https://www.coingecko.com/en/api)
2. Sign up for a free demo account
3. Go to your Developer Dashboard
4. Create a new API key
5. Add it to your `.env.local` file as `COINGECKO_API_KEY`

**Note**: CoinGecko requires proper attribution when displaying their data. The application automatically includes the required attribution as per their [attribution guide](https://brand.coingecko.com/resources/attribution-guide).

#### Additional Providers (Optional)
- **Polygon.io**: For additional market data coverage
- **Alpha Vantage**: For backup data sources

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npm run init-db
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   └── asset-search.tsx  # Asset search component
├── lib/                  # Utility libraries
│   ├── data-providers/   # Data provider implementations
│   └── auth.ts          # Authentication configuration
└── types/               # TypeScript type definitions
```

### Data Providers

The application uses a modular data provider system that allows for multiple data sources:

- **FinnhubProvider**: Primary provider for stocks (quotes and search), uses Yahoo Finance for historical OHLC data
- **CoinGeckoProvider**: Dedicated provider for cryptocurrency data (quotes, search, and historical data)
- **YahooFinanceProvider**: Provider for futures data (quotes, search, and historical data)
- **PolygonProvider**: Optional provider for additional market data coverage
- **Extensible**: Easy to add new providers (Alpha Vantage, etc.)

### Asset Types

The application supports three main asset types:

- **Stocks**: Traditional equity securities
- **Crypto**: Cryptocurrencies and digital assets  
- **Futures**: Commodity and financial futures contracts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
