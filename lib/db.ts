import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default client;

// Database initialization function
export async function initializeDatabase() {
  try {
      // Create users table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          password TEXT NOT NULL,
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

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
