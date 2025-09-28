import { getClient } from '../lib/db';

async function addCoinIdColumn() {
  const client = getClient();
  
  try {
    console.log('Adding coin_id column to watchlist table...');
    await client.execute(`
      ALTER TABLE watchlist ADD COLUMN coin_id TEXT
    `);
    console.log('✅ Added coin_id column to watchlist table');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('✅ coin_id column already exists in watchlist table');
    } else {
      console.error('❌ Error adding coin_id to watchlist:', error);
    }
  }

  try {
    console.log('Adding coin_id column to available_assets table...');
    await client.execute(`
      ALTER TABLE available_assets ADD COLUMN coin_id TEXT
    `);
    console.log('✅ Added coin_id column to available_assets table');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('✅ coin_id column already exists in available_assets table');
    } else {
      console.error('❌ Error adding coin_id to available_assets:', error);
    }
  }

  console.log('Migration completed successfully!');
}

addCoinIdColumn().catch(console.error);
