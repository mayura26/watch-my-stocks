import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

// Load environment variables from the project root
dotenv.config({ path: '.env' });

// Create client after loading environment variables
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function addPriceHistoryTable() {
  try {
    console.log('Adding price_history table...');
    
    // Create price_history table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS price_history (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol)
    `);
    
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp)
    `);
    
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp ON price_history(symbol, timestamp)
    `);

    console.log('Price history table created successfully');
    
    // Test the table
    const testResult = await client.execute('SELECT COUNT(*) as count FROM price_history');
    console.log(`Price history table test: ${testResult.rows[0]?.count} records`);
    
  } catch (error) {
    console.error('Error creating price_history table:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  addPriceHistoryTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default addPriceHistoryTable;
