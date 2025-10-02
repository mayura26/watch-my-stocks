#!/usr/bin/env tsx

import client from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

async function createTestNotification() {
  try {
    console.log('Creating test notification...');
    
    // First, let's get a user ID from the database
    const usersResult = await client.execute({
      sql: 'SELECT id, email FROM users LIMIT 1'
    });
    
    if (usersResult.rows.length === 0) {
      console.log('No users found in database. Please create a user account first.');
      return;
    }
    
    const user = usersResult.rows[0];
    console.log(`Found user: ${user.email} (ID: ${user.id})`);
    
    // Create a test alert first (required for notification)
    const alertId = uuidv4();
    await client.execute({
      sql: `
        INSERT INTO alerts (id, user_id, symbol, alert_type, threshold_value, is_active, is_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [alertId, user.id, 'TEST', 'price_above', 100, true, true]
    });
    
    console.log(`Created test alert: ${alertId}`);
    
    // Create test notification
    const notificationId = uuidv4();
    await client.execute({
      sql: `
        INSERT INTO notifications (id, user_id, alert_id, title, message, notification_type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      args: [
        notificationId, 
        user.id, 
        alertId, 
        'Test Notification: AAPL Alert',
        'AAPL rose above $150.00 ($149.50 → $150.25, +0.50%)',
        'price_alert',
        false
      ]
    });
    
    console.log(`✅ Test notification created successfully!`);
    console.log(`   Notification ID: ${notificationId}`);
    console.log(`   Alert ID: ${alertId}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Title: Test Notification: AAPL Alert`);
    console.log(`   Message: AAPL rose above $150.00 ($149.50 → $150.25, +0.50%)`);
    
    // Keep the test alert for the notification to work properly
    console.log('Test alert and notification created successfully (both remain in database)');
    
  } catch (error) {
    console.error('Error creating test notification:', error);
  }
}

// Run the script
createTestNotification()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
