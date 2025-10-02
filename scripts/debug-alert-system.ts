#!/usr/bin/env tsx

import client from '../lib/db';

async function debugAlertSystem() {
  try {
    console.log('🔍 Debugging Alert System...\n');
    
    // Check recent notifications for SNDK
    console.log('📱 Recent SNDK Notifications:');
    const notificationsResult = await client.execute({
      sql: `
        SELECT n.*, a.symbol, a.alert_type, a.threshold_value
        FROM notifications n
        JOIN alerts a ON n.alert_id = a.id
        WHERE a.symbol = 'SNDK'
        ORDER BY n.created_at DESC
        LIMIT 10
      `
    });
    
    notificationsResult.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. ${row.message}`);
      console.log(`   Alert ID: ${row.alert_id}`);
      console.log(`   Alert Type: ${row.alert_type}`);
      console.log(`   Threshold: ${row.threshold_value}%`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
    
    // Check SNDK alerts
    console.log('🚨 SNDK Alerts:');
    const alertsResult = await client.execute({
      sql: `
        SELECT * FROM alerts 
        WHERE symbol = 'SNDK'
        ORDER BY created_at DESC
      `
    });
    
    alertsResult.rows.forEach((alert: any, index: number) => {
      console.log(`${index + 1}. Alert ID: ${alert.id}`);
      console.log(`   Type: ${alert.alert_type}`);
      console.log(`   Threshold: ${alert.threshold_value}%`);
      console.log(`   Last Triggered: ${alert.last_triggered}`);
      console.log(`   Last Triggered Price: $${alert.last_triggered_price}`);
      console.log(`   Trigger Count: ${alert.trigger_count}`);
      console.log(`   Active: ${alert.is_active}, Enabled: ${alert.is_enabled}`);
      console.log('');
    });
    
    // Check price history for SNDK
    console.log('📈 SNDK Price History (Last 10 entries):');
    const priceHistoryResult = await client.execute({
      sql: `
        SELECT * FROM price_history 
        WHERE symbol = 'SNDK'
        ORDER BY timestamp DESC
        LIMIT 10
      `
    });
    
    priceHistoryResult.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. $${row.price} at ${row.timestamp}`);
    });
    
    console.log('');
    
    // Check daily open price for SNDK
    console.log('🌅 SNDK Daily Open Prices:');
    const dailyOpenResult = await client.execute({
      sql: `
        SELECT * FROM daily_open_prices 
        WHERE symbol = 'SNDK'
        ORDER BY date DESC
        LIMIT 5
      `
    });
    
    dailyOpenResult.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. $${row.open_price} on ${row.date}`);
    });
    
    console.log('\n✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Error debugging alert system:', error);
  }
}

// Run the script
debugAlertSystem()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
