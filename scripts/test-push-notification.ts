#!/usr/bin/env tsx

import { config } from 'dotenv';
import client from '../lib/db';

// Load environment variables
config();

async function testPushNotification() {
  try {
    console.log('Testing push notification...');
    
    // Get a user ID from the database
    const usersResult = await client.execute({
      sql: 'SELECT id, email FROM users LIMIT 1'
    });
    
    if (usersResult.rows.length === 0) {
      console.log('No users found in database. Please create a user account first.');
      return;
    }
    
    const user = usersResult.rows[0];
    console.log(`Found user: ${user.email} (ID: ${user.id})`);
    
    // Check if user has push subscriptions
    const subscriptionsResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ?',
      args: [user.id]
    });
    
    const subscriptionCount = subscriptionsResult.rows[0]?.count as number || 0;
    
    if (subscriptionCount === 0) {
      console.log('❌ No push subscriptions found for this user.');
      console.log('   Please install the PWA on your phone and enable push notifications first.');
      return;
    }
    
    console.log(`✅ Found ${subscriptionCount} push subscription(s) for this user.`);
    
    // Send test push notification
    const response = await fetch('http://localhost:3000/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        title: 'Test Push Notification',
        body: 'This is a test push notification from WatchMyStocks! Check your phone! 📱',
        url: '/notifications',
        alertId: 'test-push'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Push notification sent successfully!');
      console.log(`   Sent to: ${result.sent} subscription(s)`);
      console.log(`   Failed: ${result.failed} subscription(s)`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('   Errors:', result.errors);
      }
    } else {
      const error = await response.json();
      console.log('❌ Failed to send push notification:', error.error);
    }
    
  } catch (error) {
    console.error('Error testing push notification:', error);
  }
}

// Run the script
testPushNotification()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
