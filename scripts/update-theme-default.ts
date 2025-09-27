import dotenv from 'dotenv';
import client from '../lib/db';

dotenv.config({ path: '.env' });

async function updateThemeDefault() {
  try {
    console.log('Updating theme default to auto...');
    
    // Update existing users who have 'light' theme to 'auto'
    await client.execute(`
      UPDATE users 
      SET theme = 'auto' 
      WHERE theme = 'light' OR theme IS NULL
    `);
    
    console.log('Theme default updated successfully!');
  } catch (error: any) {
    console.error('Error updating theme default:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updateThemeDefault();
