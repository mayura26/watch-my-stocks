#!/usr/bin/env tsx

import client from '../lib/db';

async function addPushSubscriptionsTable() {
  try {
    console.log('Adding push_subscriptions table...');
    
    // Create push_subscriptions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        subscription_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)
    `);
    
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint)
    `);

    console.log('✅ Push subscriptions table created successfully!');
    console.log('✅ Indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating push subscriptions table:', error);
  }
}

// Run the script
addPushSubscriptionsTable()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
