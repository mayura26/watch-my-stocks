import dotenv from 'dotenv';
import client from '../lib/db';

// Load environment variables for the script
dotenv.config({ path: '.env' });

async function addNotificationTypeColumn() {
  
  try {
    console.log('Adding notification_type column to notifications table...');
    await client.execute(`
      ALTER TABLE notifications ADD COLUMN notification_type TEXT DEFAULT 'price_alert'
    `);
    console.log('✅ Added notification_type column to notifications table');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('✅ notification_type column already exists in notifications table');
    } else {
      console.error('❌ Error adding notification_type to notifications:', error);
      throw error;
    }
  }

  // Update any existing notifications that might have NULL values
  try {
    console.log('Updating existing notifications with default notification_type...');
    const result = await client.execute(`
      UPDATE notifications 
      SET notification_type = 'price_alert' 
      WHERE notification_type IS NULL
    `);
    console.log(`✅ Updated ${result.rowsAffected} existing notifications with default notification_type`);
  } catch (error) {
    console.error('❌ Error updating existing notifications:', error);
    throw error;
  }

  console.log('Migration completed successfully!');
}

addNotificationTypeColumn().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
