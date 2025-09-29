import client from './db';

let isInitialized = false;

export async function ensureDatabaseInitialized() {
  if (isInitialized) return;

  try {
    // Check if tables exist by trying to query the users table
    await client.execute('SELECT COUNT(*) FROM users LIMIT 1');
    isInitialized = true;
    console.log('Database already initialized');
  } catch {
    // Tables don't exist, initialize them
    console.log('Initializing database...');
    
    try {
      // Create users table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          theme TEXT DEFAULT 'light',
          notifications_enabled BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create watchlist table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS watchlist (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          asset_type TEXT NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Create alerts table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          threshold_value REAL NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          is_enabled BOOLEAN DEFAULT TRUE,
          last_triggered DATETIME,
          trigger_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Create notifications table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          alert_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          notification_type TEXT NOT NULL, -- 'price_alert', 'system', 'info'
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (alert_id) REFERENCES alerts(id)
        )
      `);

      // Create available_assets table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS available_assets (
          id TEXT PRIMARY KEY,
          symbol TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          asset_type TEXT NOT NULL,
          current_price REAL,
          is_active BOOLEAN DEFAULT TRUE,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create price_history table for alert cross-detection
      await client.execute(`
        CREATE TABLE IF NOT EXISTS price_history (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          price REAL NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_available_assets_symbol ON available_assets(symbol)
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_available_assets_name ON available_assets(name)
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_available_assets_type ON available_assets(asset_type)
      `);

      // Create indexes for notifications table
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_notifications_alert_id ON notifications(alert_id)
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
      `);

      // Create indexes for price_history table
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol)
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp)
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp ON price_history(symbol, timestamp)
      `);

      isInitialized = true;
      console.log('Database initialized successfully');
    } catch (initError) {
      console.error('Error initializing database:', initError);
      throw initError;
    }
  }
}
