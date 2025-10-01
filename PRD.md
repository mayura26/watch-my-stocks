# Product Requirements Document (PRD)
## Stock Watchlist App

### 1. Product Vision & Goals

**Vision:** Create a simple, intuitive stock watchlist application that helps users track their favorite stocks, futures, and crypto with smart alerting capabilities.

**Primary Goals:**
- Provide a clean, dashboard-style interface for monitoring multiple assets
- Enable users to set custom price alerts and smart movement alerts
- Deliver real-time notifications through web and PWA
- Keep the experience simple and focused on core functionality

### 2. Target Users

**Primary Users:**
- Individual investors and traders
- Crypto enthusiasts
- People who want to monitor specific stocks without complex trading interfaces
- Users who need price alerts for investment decisions

**User Personas:**
- **Casual Investor:** Wants to track a few favorite stocks and get notified of significant moves
- **Active Trader:** Needs quick access to multiple assets and real-time alerts
- **Crypto Trader:** Monitors various cryptocurrencies and wants smart alerts for volatility

### 3. Core Features

#### 3.1 Dashboard/Homepage
- **Mobile-First Grid Layout:** 
  - Responsive grid of asset cards (2 columns on mobile, 3+ on desktop)
  - Full-screen popup dialogs for detailed asset information
- **Asset Cards:** Display favorite stocks, futures, and crypto in card format
  - Ticker symbol prominently displayed
  - Favorite/star icon for watchlist management
  - Current price
  - Daily change with green/red arrows and percentage
- **Real-time Data:** Show current price, daily change, percentage change
- **Quick Actions:** Tap/click on any asset to open detailed popup dialog
- **Add Assets:** Auto-completing dropdown search from home page
- **Asset Discovery:** Search by symbol or company name with real-time suggestions
- **Asset Categories:** Separate categories for stocks, crypto, futures
- **Asset Validation:** Against internal approved asset list
- **Portfolio Management:** No limit on portfolio size, easy add/remove

#### 3.2 Asset Detail Dialog
- **Popup Dialog:** Full-screen modal on mobile, centered dialog on desktop
- **Chart Display:** Candlestick chart with two timeframes:
  - 15-minute candles (default)
  - 1-day candles
- **Key Metrics:** Display comprehensive asset data:
  - Change (absolute value)
  - % Change
  - Closed price
  - Open price
  - High price
  - Low price
  - Volume
  - Previous Close
- **Timeframe Toggle:** Switch between 15M and 1D views
- **Real-time Updates:** Chart and metrics update in real-time
- **Dialog Actions:** Close button, swipe-to-close on mobile
- **Alert Management:** Set alerts directly from the dialog

#### 3.3 Alert System
- **Alert Types:** 
  - Price above/below specific values
  - Percentage moves (1-100% validation)
- **Alert Creation:** 
  - Modal dialog with tabs (Chart/Details/Alerts)
  - Two creation paths: from stock detail dialog or main alerts page
  - Stock selection limited to portfolio stocks only
- **Alert Management:** 
  - Create, edit (threshold values only), delete alerts
  - Inline toggle switch to enable/disable alerts
  - Maximum 500 alerts per user with warning system
- **Alert Checking:** 
  - Server-side cron job every 1 minute
  - Dead bounce: max 1 alert per 15 minutes per alert condition
- **Notifications:** 
  - In-app notifications only (Web/PWA)
  - Display last 50 notifications on alerts page
  - 30-day automatic cleanup
  - Format: "AAPL hit $201.50", "TSLA moved +6.2%"

#### 3.4 User Authentication
- **Login/Register:** Email and password authentication only
- **Profile Management:** 
  - Edit first name, last name, and email
  - Theme preference (auto, light, dark) with system detection
  - Global notification enabled/disabled setting
- **Account Management:** 
  - Profile dropdown from username in top right corner
  - All settings in one editable modal
  - Account deletion with password confirmation
  - Immediate deletion of all associated data
- **Data Persistence:** Personal watchlists and alert configurations

#### 3.5 Theme System
- **Theme Options:**
  - Auto (follows system preference)
  - Light theme (forced)
  - Dark theme (forced)
- **System Detection:** Automatically detect user's OS theme preference
- **Theme Persistence:** User preference saved in database
- **Theme Toggle:** Quick toggle in navigation bar
- **Smooth Transitions:** Animated theme switching
- **Component Support:** All UI components support both themes

#### 3.6 Notifications
- **Web Notifications:** Browser-based alerts when app is open/minimized
- **PWA Support:** Install prompt only, no background notifications
- **Alert Delivery:** Real-time notifications for triggered alerts
- **Notification Permissions:** Request when user creates first alert
- **PWA Manifest:** 
  - Name: "WatchMyStocks"
  - Description: "Watchlist for all your stocks"
  - Icon: Stock chart with eye over it
  - Install prompt: Toast notification on first use (mobile only, 5 seconds)

### 4. Technical Architecture

#### 4.1 Frontend
- **Framework:** Next.js 15 with TypeScript
- **UI Library:** shadcn/ui components
- **Styling:** Tailwind CSS v4
- **State Management:** React hooks and context
- **PWA:** Service worker for offline functionality and notifications

#### 4.2 Backend
- **API:** Next.js API routes
- **Database:** Turso (SQLite-based, edge-ready)
- **Authentication:** NextAuth.js
- **Real-time:** WebSocket connections for live data

#### 4.3 Data Sources & Architecture
- **Modular Data Layer:** Support multiple data providers with unified interface
- **Primary Providers:**
  - **Finnhub API:** Free tier (60 calls/minute) - Primary for real-time data
  - **Polygon.io:** Free tier (5 calls/minute) - Backup for historical data
  - **yahoo-finance2:** Node.js wrapper - Fallback for comprehensive data
- **Chart Data Strategy:** Unified API layer that routes to best available provider
- **Timeframes Supported:** 
  - 15-minute candles
  - 1-day candles
- **Data Optimization:** 
  - Implement intelligent caching across all providers
  - Provider failover and load balancing
  - Rate limit management per provider
  - WebSocket connections for real-time updates

#### 4.4 Modular Data Provider Architecture
```typescript
// Unified data provider interface
interface DataProvider {
  name: string;
  priority: number;
  rateLimit: { calls: number; period: 'minute' | 'hour' | 'day' };
  
  // Core methods
  getQuote(symbol: string): Promise<QuoteData>;
  getHistoricalData(symbol: string, timeframe: '15m' | '1d'): Promise<CandleData[]>;
  getRealTimeData(symbol: string): Promise<RealTimeData>;
  
  // Health check
  isHealthy(): Promise<boolean>;
}

// Provider manager
class DataProviderManager {
  private providers: DataProvider[];
  private cache: Map<string, CachedData>;
  
  async getBestProvider(operation: string): Promise<DataProvider>;
  async executeWithFallback<T>(operation: () => Promise<T>): Promise<T>;
  async getQuote(symbol: string): Promise<QuoteData>;
  async getHistoricalData(symbol: string, timeframe: string): Promise<CandleData[]>;
}
```

**Provider Configuration:**
- **Finnhub:** Primary provider (60 calls/min, real-time WebSocket)
- **Polygon.io:** Secondary provider (5 calls/min, historical data)
- **yahoo-finance2:** Fallback provider (unlimited, comprehensive data)

#### 4.5 Database Schema (Turso)
```sql
-- Users table (with preferences)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  theme TEXT DEFAULT 'light', -- 'light' or 'dark'
  notifications_enabled BOOLEAN DEFAULT TRUE, -- Global notification setting
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist table
CREATE TABLE watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'stock', 'crypto', 'future'
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Enhanced alerts table
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'price_above', 'price_below', 'percentage_move'
  threshold_value REAL NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_enabled BOOLEAN DEFAULT TRUE, -- Toggle switch for enable/disable
  last_triggered DATETIME,
  trigger_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications table (30-day retention)
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (alert_id) REFERENCES alerts(id)
);

-- Available assets table (populated daily via cron)
CREATE TABLE available_assets (
  id TEXT PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'stock', 'crypto', 'future'
  current_price REAL,
  is_active BOOLEAN DEFAULT TRUE,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search performance
CREATE INDEX idx_available_assets_symbol ON available_assets(symbol);
CREATE INDEX idx_available_assets_name ON available_assets(name);
CREATE INDEX idx_available_assets_type ON available_assets(asset_type);
```

### 5. User Stories

#### 5.1 Dashboard
- As a user, I want to see all my favorite stocks in a responsive grid layout
- As a user, I want to tap/click on any stock to open a detailed popup dialog
- As a user, I want to see real-time price updates on the cards
- As a user, I want to quickly add new stocks using an auto-completing search dropdown
- As a user, I want to search for assets by symbol (e.g., "AAPL") or company name (e.g., "Apple")
- As a user, I want to see current price and company name in search results
- As a user, I want to browse assets by category (stocks, crypto, futures)
- As a user, I want the app to work seamlessly on both mobile and desktop
- As a user, I want to swipe to close dialogs on mobile devices

#### 5.2 Asset Detail Dialog
- As a user, I want to see comprehensive metrics for the selected asset in a popup
- As a user, I want to view candlestick charts with green/red candles
- As a user, I want to see OHLC data (Open, High, Low, Close)
- As a user, I want to see volume information
- As a user, I want to compare current price with previous close
- As a user, I want to toggle between 15M and 1D chart timeframes
- As a user, I want to set alerts directly from the detail dialog
- As a user, I want the dialog to be full-screen on mobile for better readability

#### 5.3 Alerts
- As a user, I want to set a price alert for when AAPL goes above $200
- As a user, I want to be notified when BTC moves more than 5% in a day
- As a user, I want to create alerts from both the stock detail dialog and main alerts page
- As a user, I want to edit alert threshold values (e.g., change $200 to $250)
- As a user, I want to enable/disable alerts with a toggle switch
- As a user, I want to see all my triggered alerts and notifications in one place
- As a user, I want to mark notifications as read
- As a user, I want to be warned when approaching the 500 alert limit

#### 5.4 User Profile & Settings
- As a user, I want to edit my first name, last name, and email
- As a user, I want to choose between light and dark theme
- As a user, I want to enable/disable notifications globally
- As a user, I want to access my profile settings from a dropdown in the top right
- As a user, I want to delete my account with password confirmation
- As a user, I want all my data to be deleted immediately when I delete my account

#### 5.5 Notifications
- As a user, I want to receive browser notifications when alerts trigger
- As a user, I want to get notifications even when the app is closed (PWA)
- As a user, I want to control which types of notifications I receive

### 6. Success Metrics

#### 6.1 User Engagement
- Daily active users
- Average session duration
- Number of alerts set per user
- Alert trigger rate

#### 6.2 Technical Performance
- Page load time < 2 seconds
- Real-time data update latency < 5 seconds
- API call efficiency (staying within free tier limits)
- PWA installation rate

#### 6.3 User Satisfaction
- User retention rate (7-day, 30-day)
- Feature adoption rate
- User feedback scores

### 7. Development Phases

#### Phase 1: MVP (Weeks 1-2)
- Mobile-first responsive grid layout
- Static asset cards with mock data
- Basic popup dialog system
- User authentication with NextAuth (email/password)
- Basic profile management (name, email, theme, notifications)
- Simple watchlist management
- Basic price alerts

#### Phase 2: Real-time Data & Charts (Weeks 3-4) ✅ COMPLETE
- ✅ Implement modular data provider architecture
- ✅ Integrate Finnhub API as primary provider
- ✅ Implement asset discovery system with daily sync
- ✅ Auto-completing search dropdown for adding assets
- ✅ Implement candlestick charts (15M and 1D)
- ✅ Real-time price updates via WebSocket
- ✅ Enhanced popup dialogs with OHLC data
- ✅ Mobile-optimized chart rendering
- ✅ Multi-provider data integration (Finnhub, Polygon.io, Yahoo Finance)
- ✅ Chart.js financial charts with theme-aware colors
- ✅ Market hours logic for futures data

#### Phase 3: Enhanced Features (Weeks 5-6) ✅ COMPLETE
- ✅ Add Polygon.io as secondary provider
- ✅ Implement provider failover logic
- ✅ Enhanced alert system with percentage moves
- ✅ Alert management UI (create, edit, delete, toggle)
- ✅ Alert creation from stock detail dialogs and alerts page
- ✅ Advanced notification system with in-app notifications
- ✅ Chart timeframe toggling
- ✅ Alert limit warnings (500 per user)
- ✅ Dead bounce mechanism (15-minute cooldown)
- ✅ Server-side alert checking (1-minute interval)
- ✅ Notification bell with unread count
- ✅ Notifications page with filter and search
- ✅ Enhanced navigation bar with active page highlighting
- [ ] PWA implementation (install prompt, manifest) - Pending
- [ ] Swipe gestures for mobile dialogs - Pending

#### Phase 4: Polish & Optimization (Weeks 7-8) 🚧 IN PROGRESS
- ✅ Add yahoo-finance2 as fallback provider
- ✅ Notification cleanup system (30-day retention)
- ✅ Docker containerization
- ✅ Coolify deployment setup
- ✅ Self-hosting documentation
- ✅ Profile & Settings system
- ✅ Account deletion functionality
- [ ] Performance optimization
- [ ] Mobile UX improvements
- [ ] Advanced caching strategies
- [ ] Testing and bug fixes
- [ ] Touch gesture optimization
- [ ] Dialog animation improvements
- [ ] PWA features (manifest, service worker, install prompt)

### 8. Technical Considerations

#### 8.1 Modular Data Provider Integration
- **Provider Interface:** Create unified interface for all data providers
- **Rate Limit Management:** Track and manage API calls per provider
- **Intelligent Caching:** Cache data across all providers with TTL
- **Failover Logic:** Automatic fallback when primary provider fails
- **Load Balancing:** Distribute API calls across available providers
- **WebSocket Management:** Use best available provider for real-time data

#### 8.2 Alert System Architecture
- **Cron Job Implementation:** Docker container running alert checker every 1 minute
- **Dead Bounce Logic:** Prevent spam alerts (max 1 per 15 minutes per alert)
- **Database Optimization:** Efficient queries for active alerts and notifications
- **Notification Storage:** 30-day retention with automatic cleanup
- **Rate Limiting:** Respect provider API limits during alert checking

#### 8.3 Asset Discovery System
- **Daily Asset Sync:** Cron job to populate available_assets table from all providers
- **Search Performance:** Indexed database for fast symbol and name lookups
- **Auto-complete API:** Efficient search endpoint for dropdown suggestions
- **Asset Validation:** Verify symbols against internal approved list only
- **Category Management:** Separate handling for stocks, crypto, and futures

#### 8.4 Performance
- Implement server-side rendering for initial load
- Use React Query for data fetching and caching
- Optimize bundle size with code splitting
- Implement proper error boundaries
- Optimize chart rendering performance for mobile
- Implement virtual scrolling for large watchlists
- Optimize dialog rendering and animations
- Implement touch gesture handling

#### 8.5 Security
- Secure API endpoints
- Input validation and sanitization
- Rate limiting on API routes
- Secure environment variable management
- Validate data from all providers before processing
- Implement CORS policies for API routes

### 9. Risks & Mitigation

#### 9.1 Data Provider Reliability
- **Risk:** Individual providers may have outages or rate limits
- **Mitigation:** Implement multi-provider architecture with automatic failover

#### 9.2 Chart Data Performance
- **Risk:** Real-time chart updates may impact performance
- **Mitigation:** Implement efficient chart rendering, debounce updates, use WebGL for large datasets

#### 9.3 PWA Complexity
- **Risk:** PWA implementation may be complex
- **Mitigation:** Start with basic PWA features, iterate

#### 9.4 Data Accuracy & Consistency
- **Risk:** Different providers may return inconsistent data
- **Mitigation:** Implement data validation, cross-provider comparison, and user feedback mechanisms

### 10. Future Enhancements

- Portfolio tracking
- Advanced charting
- Social features (sharing watchlists)
- Mobile app (React Native)
- Advanced technical indicators
- News integration
- Earnings calendar
- Options data

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Next Review:** [Date + 1 week]
