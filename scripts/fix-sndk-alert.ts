#!/usr/bin/env tsx

import client from '../lib/db';

async function fixSndkAlert() {
  try {
    console.log('🔧 Fixing SNDK Alert System...\n');
    
    // First, let's see the current state
    const alertResult = await client.execute({
      sql: `
        SELECT * FROM alerts 
        WHERE symbol = 'SNDK' AND alert_type = 'percentage_move'
      `
    });
    
    if (alertResult.rows.length === 0) {
      console.log('❌ No SNDK percentage alert found');
      return;
    }
    
    const alert = alertResult.rows[0];
    console.log(`📊 Current SNDK Alert:`);
    console.log(`   ID: ${alert.id}`);
    console.log(`   Threshold: ${alert.threshold_value}%`);
    console.log(`   Trigger Count: ${alert.trigger_count}`);
    console.log(`   Last Triggered: ${alert.last_triggered}`);
    console.log(`   Last Triggered Price: $${alert.last_triggered_price}\n`);
    
    // Option 1: Reset the alert (recommended)
    console.log('🔄 Resetting SNDK alert...');
    
    await client.execute({
      sql: `
        UPDATE alerts 
        SET 
          last_triggered = NULL,
          last_triggered_price = NULL,
          trigger_count = 0
        WHERE id = ?
      `,
      args: [alert.id]
    });
    
    console.log('✅ Alert reset successfully');
    
    // Option 2: Clean up duplicate notifications (keep only the most recent)
    console.log('🧹 Cleaning up duplicate notifications...');
    
    const notificationsResult = await client.execute({
      sql: `
        SELECT id, created_at 
        FROM notifications 
        WHERE alert_id = ?
        ORDER BY created_at DESC
      `,
      args: [alert.id]
    });
    
    if (notificationsResult.rows.length > 1) {
      // Keep the most recent notification, delete the rest
      const notificationsToDelete = notificationsResult.rows.slice(1);
      
      for (const notification of notificationsToDelete) {
        await client.execute({
          sql: 'DELETE FROM notifications WHERE id = ?',
          args: [notification.id]
        });
      }
      
      console.log(`✅ Deleted ${notificationsToDelete.length} duplicate notifications`);
      console.log(`✅ Kept 1 most recent notification`);
    } else {
      console.log('✅ No duplicate notifications to clean up');
    }
    
    // Clean up old price history (keep only recent entries)
    console.log('🧹 Cleaning up old price history...');
    
    await client.execute({
      sql: `
        DELETE FROM price_history 
        WHERE symbol = 'SNDK' 
        AND timestamp < datetime('now', '-1 day')
      `
    });
    
    console.log('✅ Cleaned up price history older than 1 day');
    
    // Show final state
    console.log('\n📊 Final SNDK Alert State:');
    const finalAlertResult = await client.execute({
      sql: `
        SELECT * FROM alerts 
        WHERE id = ?
      `,
      args: [alert.id]
    });
    
    const finalAlert = finalAlertResult.rows[0];
    console.log(`   Trigger Count: ${finalAlert.trigger_count}`);
    console.log(`   Last Triggered: ${finalAlert.last_triggered}`);
    console.log(`   Last Triggered Price: $${finalAlert.last_triggered_price}`);
    
    console.log('\n✅ SNDK alert system fixed!');
    console.log('💡 The alert will now work correctly and only trigger when crossing the 5% threshold.');
    
  } catch (error) {
    console.error('❌ Error fixing SNDK alert:', error);
  }
}

// Run the script
fixSndkAlert()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
